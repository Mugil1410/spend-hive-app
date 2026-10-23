import { Alert, AppState, Linking } from 'react-native';
import { useEffect } from 'react';
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import api from '@/services/api';

export interface RequiredUpdate {
  version: string;
  updateUrl?: string;
}

// A forced update is remembered, so going offline or killing the app can't skip it.
const REQUIRED_UPDATE_KEY = 'spendhive-required-update';

export const useRequiredUpdate = create<{ required: RequiredUpdate | null }>(() => ({ required: null }));

/** True when version a is newer than b (numeric, dot-separated: 1.1.10 > 1.1.9). */
export function isNewerVersion(a: string, b: string): boolean {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

export function openUpdateUrl(updateUrl?: string) {
  if (updateUrl) Linking.openURL(updateUrl).catch(() => {});
}

function setRequired(required: RequiredUpdate | null) {
  useRequiredUpdate.setState({ required });
  (required
    ? AsyncStorage.setItem(REQUIRED_UPDATE_KEY, JSON.stringify(required))
    : AsyncStorage.removeItem(REQUIRED_UPDATE_KEY)
  ).catch(() => {});
}

async function loadStoredRequired(): Promise<RequiredUpdate | null> {
  try {
    const raw = await AsyncStorage.getItem(REQUIRED_UPDATE_KEY);
    const stored: RequiredUpdate | null = raw ? JSON.parse(raw) : null;
    return stored?.version && isNewerVersion(stored.version, DeviceInfo.getVersion()) ? stored : null;
  } catch {
    return null;
  }
}

// Optional updates are offered once per launch per version.
let offeredVersion: string | null = null;

async function checkForUpdate() {
  const stored = await loadStoredRequired();
  if (stored) useRequiredUpdate.setState({ required: stored });

  try {
    const res = await api.post('/check-version');
    const { currentVersion, updateUrl, forceUpdate } = res.data?.data ?? {};
    const installed = DeviceInfo.getVersion();

    if (!currentVersion || !isNewerVersion(currentVersion, installed)) {
      setRequired(null);
      return;
    }
    if (forceUpdate === 'Y') {
      setRequired({ version: currentVersion, updateUrl });
      return;
    }
    // The latest release is optional, but an earlier forced one may still be missing.
    setRequired(stored);
    if (!stored && offeredVersion !== currentVersion) {
      offeredVersion = currentVersion;
      Alert.alert('Update available', `Version ${currentVersion} of Spend Hive is available. Would you like to update?`, [
        { text: 'Later', style: 'cancel' },
        { text: 'Update', onPress: () => openUpdateUrl(updateUrl) },
      ]);
    }
  } catch (err: any) {
    console.log('[check-version] failed:', err?.response?.status, err?.response?.data ?? err?.message);
  }
}

/**
 * Checks for a new version on launch and every time the app returns to the foreground (e.g. from
 * the browser opened by Update, or from recent apps). A forced update shows UpdateRequiredScreen.
 */
export function useUpdateCheck() {
  useEffect(() => {
    checkForUpdate();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkForUpdate();
    });
    return () => sub.remove();
  }, []);
}
