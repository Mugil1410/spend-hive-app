import { useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from '@/store/useStore';
import { rescheduleReminders, requestNotificationPermission } from './scheduler';
import { flushPendingNotificationTap, subscribeForegroundNotificationTaps } from './notificationTaps';

const PERMISSION_ASKED_KEY = 'spendhive:notificationPermissionAsked';

/**
 * Keeps scheduled reminders in sync with the store, asks for notification permission when
 * reminders are on, and routes notification taps. Mount once, after the store has hydrated.
 */
export function useNotifications() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      // Debounced: a payment or bulk import can fire many store updates in a row.
      timer = setTimeout(() => {
        const { notificationSettings, cashbookEntries, currency } = useStore.getState();
        rescheduleReminders({ notificationSettings, cashbookEntries, currency }).catch(() => {});
      }, 500);
    };

    (async () => {
      const firstLaunch = !(await AsyncStorage.getItem(PERMISSION_ASKED_KEY).catch(() => null));
      const { enabled } = useStore.getState().notificationSettings;
      // Ask once on first launch; afterwards only when reminders are on but permission is missing
      // (revoked in system settings, or data restored onto a fresh install).
      if (firstLaunch || enabled) {
        await AsyncStorage.setItem(PERMISSION_ASKED_KEY, '1').catch(() => {});
        const granted = await requestNotificationPermission().catch(() => false);
        if (firstLaunch && granted && !enabled) {
          useStore.getState().updateNotificationSettings({ enabled: true }); // triggers schedule via subscribe
        }
      }
      schedule();
    })();

    const unsubStore = useStore.subscribe((state, prev) => {
      if (
        state.notificationSettings !== prev.notificationSettings ||
        state.cashbookEntries !== prev.cashbookEntries ||
        state.currency !== prev.currency
      ) {
        schedule();
      }
    });

    const unsubTaps = subscribeForegroundNotificationTaps();

    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      flushPendingNotificationTap().catch(() => {});
      // Returning from system settings may have changed permissions.
      schedule();
    });

    return () => {
      clearTimeout(timer);
      unsubStore();
      unsubTaps();
      appStateSub.remove();
    };
  }, []);
}
