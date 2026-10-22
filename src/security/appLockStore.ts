import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { appStorage } from '@/store/storage';

/** 'device' = the phone's own biometrics / screen lock; the rest are Spend Hive-only credentials. */
export type LockMethod = 'device' | 'pin' | 'passcode' | 'pattern';
export type CustomLockMethod = Exclude<LockMethod, 'device'>;

export interface AppLockState {
  enabled: boolean;
  method: LockMethod | null;
  /** 0 = lock as soon as the app leaves the foreground. */
  timeoutMinutes: number;
  /** PIN length, so the lock screen can submit as soon as enough digits are typed. */
  pinLength: number;
  failedAttempts: number;
  lockoutUntil: number;
  /** When the app last left the foreground (epoch ms), persisted so the timeout survives process death. */
  backgroundedAt: number | null;

  // Runtime only.
  locked: boolean;
  hydrated: boolean;
}

/**
 * App Lock settings. Kept out of the main store so backups/restores never carry lock state; the
 * credential itself lives in the Android Keystore-backed SecureStore, never here.
 */
export const useAppLock = create<AppLockState>()(
  persist(
    (): AppLockState => ({
      enabled: false,
      method: null,
      timeoutMinutes: 0,
      pinLength: 4,
      failedAttempts: 0,
      lockoutUntil: 0,
      backgroundedAt: null,
      locked: false,
      hydrated: false,
    }),
    {
      name: 'spendhive-app-lock',
      storage: createJSONStorage(() => appStorage),
      version: 2,
      // v2: "use device authentication" stopped being an add-on to a custom lock; it is now its own
      // method. Existing custom locks are kept as they are.
      migrate: (persisted: any) => {
        const { useDeviceAuth: _drop, ...rest } = persisted ?? {};
        return rest;
      },
      partialize: (s) => ({
        enabled: s.enabled,
        method: s.method,
        timeoutMinutes: s.timeoutMinutes,
        pinLength: s.pinLength,
        failedAttempts: s.failedAttempts,
        lockoutUntil: s.lockoutUntil,
        backgroundedAt: s.backgroundedAt,
      }),
      onRehydrateStorage: () => (state) => {
        // Cold start: lock unless the app was backgrounded less than the timeout ago.
        const s = state ?? useAppLock.getState();
        const elapsedMs = s.backgroundedAt == null ? Infinity : Date.now() - s.backgroundedAt;
        const locked = s.enabled && !!s.method && elapsedMs >= s.timeoutMinutes * 60_000;
        useAppLock.setState({ hydrated: true, locked });
      },
    }
  )
);
