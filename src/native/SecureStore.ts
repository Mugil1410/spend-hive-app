import { NativeModules } from 'react-native';

// Bridge to android/app/src/main/java/com/spendhive/security/SecureStoreModule.kt:
// Android Keystore-encrypted key/value storage plus the system biometric / screen-lock prompt.

export interface DeviceAuthStatus {
  /** A fingerprint/face is enrolled. */
  biometricEnrolled: boolean;
  /** The phone has a screen lock (PIN, pattern or password). */
  deviceSecure: boolean;
  /** The system prompt can be shown (biometrics and/or device credential). */
  available: boolean;
}

interface SecureStoreNative {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  deleteItem(key: string): Promise<void>;
  getDeviceAuthStatus(): Promise<DeviceAuthStatus>;
  authenticate(title: string, subtitle: string): Promise<boolean>;
}

const native: SecureStoreNative | undefined = NativeModules.SpendHiveSecureStore;

function requireNative(): SecureStoreNative {
  if (!native) throw new Error('Secure storage is not available on this device.');
  return native;
}

export const SecureStore = {
  setItem: (key: string, value: string) => requireNative().setItem(key, value),
  getItem: (key: string) => requireNative().getItem(key),
  deleteItem: (key: string) => requireNative().deleteItem(key),
  getDeviceAuthStatus: async (): Promise<DeviceAuthStatus> =>
    native ? native.getDeviceAuthStatus() : { biometricEnrolled: false, deviceSecure: false, available: false },
  authenticate: (title: string, subtitle: string) => requireNative().authenticate(title, subtitle),
};
