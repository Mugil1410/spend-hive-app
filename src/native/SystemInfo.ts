import { NativeModules, Platform } from 'react-native';

// Bridge to android/app/src/main/java/com/spendhive/system/SystemInfoModule.kt.
// Byte counts are numbers (doubles); null means Android does not expose that metric to apps.

export interface MemoryInfo {
  total: number;
  available: number;
  threshold: number;
  lowMemory: boolean;
  appUsed: number;
}

export interface CpuInfo {
  cores: number;
  hardware: string | null;
  abi: string | null;
  deviceUsage: number | null;
  appUsage: number | null;
  coreFrequencies: { currentKHz: number | null; maxKHz: number | null }[];
}

export interface StorageInfo {
  total: number;
  available: number;
  appCode: number;
  appData: number;
  appCache: number;
}

export type ConnectionType = 'wifi' | 'cellular' | 'ethernet' | 'vpn' | 'bluetooth' | 'other' | 'none';

export interface NetworkInfo {
  mobileRx: number | null;
  mobileTx: number | null;
  otherRx: number | null;
  otherTx: number | null;
  totalRx: number | null;
  totalTx: number | null;
  appRx: number | null;
  appTx: number | null;
  /** Epoch ms of the last boot; the counters above accumulate from then. */
  since: number;
  type: ConnectionType;
  connected: boolean;
  validated: boolean;
  metered: boolean;
  downKbps?: number;
  upKbps?: number;
}

interface SystemInfoNative {
  getMemoryInfo(): Promise<MemoryInfo>;
  getCpuInfo(): Promise<CpuInfo>;
  getStorageInfo(): Promise<StorageInfo>;
  getNetworkInfo(): Promise<NetworkInfo>;
}

const native: SystemInfoNative | undefined = NativeModules.SpendHiveSystemInfo;

export const isSystemInfoAvailable = Platform.OS === 'android' && !!native;

function call<K extends keyof SystemInfoNative>(name: K): ReturnType<SystemInfoNative[K]> {
  if (!native) return Promise.reject(new Error('System analytics is only available on Android.')) as any;
  return native[name]() as any;
}

export const SystemInfo = {
  getMemoryInfo: () => call('getMemoryInfo'),
  getCpuInfo: () => call('getCpuInfo'),
  getStorageInfo: () => call('getStorageInfo'),
  getNetworkInfo: () => call('getNetworkInfo'),
};
