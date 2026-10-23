import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import api from '@/services/api';
import { isSystemInfoAvailable, SystemInfo } from '@/native/SystemInfo';
import { stringToUtf8Bytes } from '@/utils/utf8';

// Cloud backups are the same password-encrypted container as a local backup file, stored on the
// Spend Hive server. By default they belong to this phone's device ID, so they can be restored
// here (also after a reinstall). Giving an email instead files them under that email, so they can
// be restored on a new phone. The server never sees the password: it gets an auth key derived
// from the owner + password (unrelated to the Argon2id encryption key), so all cloud backups for
// one device or one email share one password.

export const MAX_CLOUD_BACKUPS = 3;
const EMAIL_KEY = 'spendhive-cloud-backup-email';
const TIMEOUT_MS = 60000;

export interface CloudBackupSummary {
  id: string;
  createdAt: string;
  sizeBytes: number;
  deviceName: string;
  appVersion: string;
}

/** Empty email = the backups of this device. */
export interface CloudCredentials {
  email: string;
  password: string;
}

/** Thrown when the server already holds MAX_CLOUD_BACKUPS for this device / email. */
export class CloudBackupLimitError extends Error {}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/**
 * Resolves true when the phone is online. Otherwise tells the user and resolves false. Uses the
 * System Analytics bridge (Android); where that isn't available the request itself will report it.
 */
export async function ensureOnline(): Promise<boolean> {
  if (!isSystemInfoAvailable) return true;
  try {
    const net = await SystemInfo.getNetworkInfo();
    if (net.connected && net.validated) return true;
    Alert.alert(
      'No Internet Connection',
      net.connected
        ? 'Your phone is connected to a network, but it has no internet access. Cloud backup and restore need internet.'
        : 'Cloud backup and restore need an internet connection. Turn on Wi-Fi or mobile data and try again.'
    );
    return false;
  } catch {
    return true;
  }
}

export async function getSavedCloudEmail(): Promise<string> {
  return (await AsyncStorage.getItem(EMAIL_KEY).catch(() => null)) ?? '';
}

function saveCloudEmail(email: string) {
  if (email.trim()) AsyncStorage.setItem(EMAIL_KEY, normalizeEmail(email)).catch(() => {});
}

/** The server's message when it sent one, otherwise a generic network message. */
export function cloudErrorMessage(e: any): string {
  return (
    e?.response?.data?.message ??
    (e?.response ? 'The server could not complete the request.' : 'Could not reach the server. Check your internet connection.')
  );
}

async function post<T>(path: string, { email, password }: CloudCredentials, body: object = {}): Promise<T> {
  const deviceId = await DeviceInfo.getUniqueId();
  // Must match the server's owner key: "email:<address>" or "device:<id>".
  const owner = email.trim() ? `email:${normalizeEmail(email)}` : `device:${deviceId}`;
  const authKey = bytesToHex(sha256(stringToUtf8Bytes(`spendhive-cloud-auth-v1\n${owner}\n${password}`)));
  const res = await api.post(
    `/cloud-backup/${path}`,
    { deviceId, email: email.trim() ? normalizeEmail(email) : undefined, authKey, ...body },
    { timeout: TIMEOUT_MS }
  );
  return res.data.data as T;
}

export async function uploadCloudBackup(
  credentials: CloudCredentials,
  payload: string,
  replaceId?: string
): Promise<CloudBackupSummary[]> {
  try {
    const data = await post<{ backups: CloudBackupSummary[] }>('upload', credentials, {
      payload,
      replaceId,
      deviceName: `${DeviceInfo.getBrand()} ${DeviceInfo.getModel()}`,
      appVersion: DeviceInfo.getVersion(),
    });
    saveCloudEmail(credentials.email);
    return data.backups;
  } catch (e: any) {
    if (e?.response?.status === 409) throw new CloudBackupLimitError(cloudErrorMessage(e));
    throw e;
  }
}

export async function listCloudBackups(credentials: CloudCredentials): Promise<CloudBackupSummary[]> {
  const data = await post<{ backups: CloudBackupSummary[] }>('list', credentials);
  saveCloudEmail(credentials.email);
  return data.backups;
}

export async function downloadCloudBackup(credentials: CloudCredentials, id: string): Promise<string> {
  const data = await post<{ payload: string }>('download', credentials, { id });
  return data.payload;
}

export async function deleteCloudBackup(credentials: CloudCredentials, id: string): Promise<CloudBackupSummary[]> {
  const data = await post<{ backups: CloudBackupSummary[] }>('delete', credentials, { id });
  return data.backups;
}
