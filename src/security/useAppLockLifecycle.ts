import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAppLock } from './appLockStore';
import { isSystemPromptActive } from './AppLockService';

/**
 * Locks the app when it returns to the foreground after the configured timeout (or as soon as it
 * leaves the foreground for "Immediately"). In-app navigation never changes AppState, so it never
 * triggers a lock. Mount once.
 */
export function useAppLockLifecycle() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      // The biometric / device-credential prompt briefly pauses our activity.
      if (isSystemPromptActive()) return;
      const s = useAppLock.getState();
      if (!s.enabled || !s.method || s.locked) return;

      if (next === 'background') {
        useAppLock.setState({ backgroundedAt: Date.now(), locked: s.timeoutMinutes === 0 });
      } else if (next === 'active') {
        const away = s.backgroundedAt == null ? 0 : Date.now() - s.backgroundedAt;
        useAppLock.setState({ backgroundedAt: null, locked: away >= s.timeoutMinutes * 60_000 && s.backgroundedAt != null });
      }
    });
    return () => sub.remove();
  }, []);
}
