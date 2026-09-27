import notifee, { Event, EventType } from '@notifee/react-native';
import { navigationRef } from '@/navigation/navigationRef';
import { useStore } from '@/store/useStore';

// Entry to open once navigation is ready (tap arrived while the app was quit or backgrounded).
let pendingEntryId: string | null = null;

function openEntry(entryId: string) {
  // The entry may have been deleted since the reminder was scheduled.
  if (!useStore.getState().cashbookEntries.some((e) => e.id === entryId)) return;
  if (navigationRef.isReady()) {
    navigationRef.navigate('CashbookEntryDetail', { entryId });
  } else {
    pendingEntryId = entryId;
  }
}

function entryIdFrom(event: Event): string | null {
  if (event.type !== EventType.PRESS) return null;
  const id = event.detail.notification?.data?.entryId;
  return typeof id === 'string' ? id : null;
}

/** Registered in index.js: taps while the app is in the background arrive here. */
export async function onBackgroundNotificationEvent(event: Event) {
  const entryId = entryIdFrom(event);
  if (entryId) pendingEntryId = entryId;
}

/** Taps while the app is open. Returns the unsubscribe function. */
export function subscribeForegroundNotificationTaps() {
  return notifee.onForegroundEvent((event) => {
    const entryId = entryIdFrom(event);
    if (entryId) openEntry(entryId);
  });
}

/** Opens whatever a tap left pending (cold start or return from background). */
export async function flushPendingNotificationTap() {
  if (!pendingEntryId) {
    const initial = await notifee.getInitialNotification();
    const id = initial?.notification.data?.entryId;
    if (typeof id === 'string') pendingEntryId = id;
  }
  if (pendingEntryId && navigationRef.isReady()) {
    const id = pendingEntryId;
    pendingEntryId = null;
    openEntry(id);
  }
}

export function handleNavigationReady() {
  flushPendingNotificationTap().catch(() => {});
}
