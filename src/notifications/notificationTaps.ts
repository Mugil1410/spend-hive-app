import { notifee, Event, EventType } from './notifeeClient';
import { navigationRef } from '@/navigation/navigationRef';
import { BottomTabParamList } from '@/navigation/types';
import { useStore } from '@/store/useStore';
import { NotificationTarget, useNotificationHistory } from './notificationHistory';
import { notificationTarget, recordNotifeeNotification, syncDisplayedNotifications } from './NotificationService';

const TAB_ROUTES: (keyof BottomTabParamList)[] = [
  'Records',
  'Analysis',
  'Budgets',
  'Accounts',
  'Cashbook',
  'Categories',
  'Events',
  'Settings',
  'Preferences',
];

// Destination to open once navigation is ready (tap arrived while the app was quit or backgrounded).
let pendingTarget: NotificationTarget | null = null;

function targetStillExists(target: NotificationTarget): boolean {
  const s = useStore.getState();
  const p = target.params ?? {};
  if (target.route === 'CashbookEntryDetail') return s.cashbookEntries.some((e) => e.id === p.entryId);
  if (target.route === 'EventDetail') return s.events.some((e) => e.id === p.eventId);
  return true;
}

/** Opens a notification's destination: a tab, a root-stack screen, or the notification center. */
export function openNotificationTarget(target: NotificationTarget | undefined) {
  const dest: NotificationTarget = target && targetStillExists(target) ? target : { route: 'Notifications' };
  if (!navigationRef.isReady()) {
    pendingTarget = dest;
    return;
  }
  if ((TAB_ROUTES as string[]).includes(dest.route)) {
    navigationRef.navigate('Drawer', {
      screen: 'MainTabs',
      params: { screen: dest.route as keyof BottomTabParamList },
    });
  } else {
    navigationRef.navigate(dest.route as any, dest.params as any);
  }
}

async function handleEvent(event: Event, foreground: boolean) {
  const notification = event.detail.notification;
  if (!notification) return;
  if (event.type === EventType.DELIVERED) {
    await recordNotifeeNotification(notification);
  } else if (event.type === EventType.PRESS) {
    const record = await recordNotifeeNotification(notification, { read: true });
    useNotificationHistory.getState().markRead(record.id);
    const target = notificationTarget(notification);
    if (foreground) openNotificationTarget(target);
    else pendingTarget = target ?? { route: 'Notifications' };
  }
}

/** Registered in index.js: deliveries and taps while the app is in the background arrive here. */
export async function onBackgroundNotificationEvent(event: Event) {
  await handleEvent(event, false).catch(() => {});
}

/** Deliveries and taps while the app is open. Returns the unsubscribe function. */
export function subscribeForegroundNotificationTaps() {
  return notifee.onForegroundEvent((event) => {
    handleEvent(event, true).catch(() => {});
  });
}

let initialChecked = false;

/** Records tray notifications and opens whatever a tap left pending (cold start or return from background). */
export async function flushPendingNotificationTap() {
  if (!initialChecked) {
    initialChecked = true;
    const initial = await notifee.getInitialNotification();
    if (initial && !pendingTarget) {
      const record = await recordNotifeeNotification(initial.notification, { read: true });
      useNotificationHistory.getState().markRead(record.id);
      pendingTarget = notificationTarget(initial.notification) ?? { route: 'Notifications' };
    }
  }
  await syncDisplayedNotifications().catch(() => {});
  if (pendingTarget && navigationRef.isReady()) {
    const target = pendingTarget;
    pendingTarget = null;
    openNotificationTarget(target);
  }
}

export function handleNavigationReady() {
  flushPendingNotificationTap().catch(() => {});
}
