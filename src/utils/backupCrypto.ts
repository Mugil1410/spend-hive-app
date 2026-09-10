// Encrypted backup container: AES-256-GCM (authenticated encryption, via the platform's
// native crypto through expo-crypto) with a key derived from the user's password using
// Argon2id (pure-JS, tuned down from its 1 GiB default to a mobile-appropriate memory cost).
// The key itself is never stored - only the salt, cipher metadata, and ciphertext are.
import { AESEncryptionKey, AESSealedData, aesEncryptAsync, aesDecryptAsync, getRandomBytesAsync } from 'expo-crypto';
import { argon2idAsync } from '@noble/hashes/argon2.js';
import { bytesToHex, hexToBytes, utf8ToBytes, bytesToUtf8 } from '@noble/ciphers/utils.js';

export const BACKUP_FORMAT_VERSION = 1;

const SALT_LENGTH = 16;
// OWASP-recommended minimum cost for Argon2id when memory is constrained (mobile devices).
const DEFAULT_ARGON2_T = 3;
const DEFAULT_ARGON2_M_KIB = 19456; // ~19 MiB
const DEFAULT_ARGON2_P = 1;
const KEY_LENGTH = 32; // AES-256

export interface EncryptedBackupContainer {
  container: 'spendhive-encrypted-backup';
  formatVersion: number;
  kdf: { type: 'argon2id'; t: number; m: number; p: number; saltHex: string };
  cipher: { type: 'aes-256-gcm'; ivLength: number; tagLength: number };
  createdAt: string;
  dbBackupVersion: number;
  payloadB64: string;
}

export class BackupFormatError extends Error {}
export class BackupPasswordError extends Error {}

async function deriveKey(password: string, salt: Uint8Array, t: number, m: number, p: number): Promise<Uint8Array> {
  return argon2idAsync(password, salt, { t, m, p, dkLen: KEY_LENGTH });
}

export async function encryptBackup(
  plaintextJson: string,
  password: string,
  dbBackupVersion: number
): Promise<EncryptedBackupContainer> {
  const salt = await getRandomBytesAsync(SALT_LENGTH);
  const keyBytes = await deriveKey(password, salt, DEFAULT_ARGON2_T, DEFAULT_ARGON2_M_KIB, DEFAULT_ARGON2_P);
  const key = await AESEncryptionKey.import(keyBytes);
  const sealed = await aesEncryptAsync(utf8ToBytes(plaintextJson), key);
  const payloadB64 = await sealed.combined('base64');

  return {
    container: 'spendhive-encrypted-backup',
    formatVersion: BACKUP_FORMAT_VERSION,
    kdf: {
      type: 'argon2id',
      t: DEFAULT_ARGON2_T,
      m: DEFAULT_ARGON2_M_KIB,
      p: DEFAULT_ARGON2_P,
      saltHex: bytesToHex(salt),
    },
    cipher: { type: 'aes-256-gcm', ivLength: sealed.ivSize, tagLength: sealed.tagSize },
    createdAt: new Date().toISOString(),
    dbBackupVersion,
    payloadB64,
  };
}

export function parseEncryptedBackupContainer(text: string): EncryptedBackupContainer {
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupFormatError('This does not look like a SpendHive backup file.');
  }
  if (!data || typeof data !== 'object' || data.container !== 'spendhive-encrypted-backup') {
    throw new BackupFormatError('This does not look like a SpendHive backup file.');
  }
  if (typeof data.formatVersion !== 'number' || data.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new BackupFormatError('This backup was created by a newer version of SpendHive. Please update the app.');
  }
  if (!data.kdf?.saltHex || !data.cipher || typeof data.payloadB64 !== 'string') {
    throw new BackupFormatError('This backup file is incomplete or corrupted.');
  }
  return data as EncryptedBackupContainer;
}

export async function decryptBackup(container: EncryptedBackupContainer, password: string): Promise<string> {
  if (container.kdf.type !== 'argon2id' || container.cipher.type !== 'aes-256-gcm') {
    throw new BackupFormatError('This backup uses an encryption scheme this app version does not support.');
  }
  try {
    const salt = hexToBytes(container.kdf.saltHex);
    const keyBytes = await deriveKey(password, salt, container.kdf.t, container.kdf.m, container.kdf.p);
    const key = await AESEncryptionKey.import(keyBytes);
    const sealed = AESSealedData.fromCombined(container.payloadB64, {
      ivLength: container.cipher.ivLength,
      tagLength: container.cipher.tagLength as 16 | 15 | 14 | 13 | 12 | 8 | 4,
    });
    const plaintextBytes = await aesDecryptAsync(sealed, key, { output: 'bytes' });
    return bytesToUtf8(plaintextBytes as Uint8Array);
  } catch (e) {
    if (e instanceof BackupFormatError) throw e;
    throw new BackupPasswordError('Incorrect password, or this backup file is corrupted.');
  }
}
