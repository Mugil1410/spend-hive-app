import { format } from 'date-fns';
import { notifee, AndroidImportance } from './notifeeClient';
import type { Notification } from '@notifee/react-native';
import {
  AppNotification,
  NotificationCategory,
  NotificationTarget,
  useNotificationHistory,
  whenHistoryHydrated,
} from './notificationHistory';
import { generateId } from '@/utils/id';
import { hasNotificationPermission } from './scheduler';

export const CHANNEL_ID = 'reminders';

export const ANDROID_DEFAULTS = {
  channelId: CHANNEL_ID,
  smallIcon: 'ic_notification',
  pressAction: { id: 'default', launchActivity: 'default' },
};

/** Notifee `data` payload (string values only) carrying the category and tap destination. */
export function notificationData(category: NotificationCategory, target?: NotificationTarget): Record<string, string> {
  const data: Record<string, string> = { category };
  if (target) {
    data.route = target.route;
    if (target.params) data.params = JSON.stringify(target.params);
  }
  return data;
}

function targetFromData(data: Notification['data']): NotificationTarget | undefined {
  if (!data) return undefined;
  if (typeof data.route === 'string') {
    let params: Record<string, unknown> | undefined;
    try {
      params = typeof data.params === 'string' ? JSON.parse(data.params) : undefined;
    } catch {
      params = undefined;
    }
    return { route: data.route, params };
  }
  // Reminders scheduled by older versions only carried the cashbook entry id.
  if (typeof data.entryId === 'string') return { route: 'CashbookEntryDetail', params: { entryId: data.entryId } };
  return undefined;
}

function categoryFromData(data: Notification['data']): NotificationCategory {
  const c = data?.category;
  return c === 'loan' || c === 'lent' || c === 'daily' || c === 'test' ? c : 'system';
}

/**
 * A repeating trigger (the daily reminder) reuses its id, so one delivery is identified by id + day.
 */
function deliveryKey(notificationId: string | undefined, at: number) {
  return `${notificationId ?? 'unknown'}|${format(at, 'yyyy-MM-dd')}`;
}

/** Records a notification Notifee showed (delivered, found in the tray, or tapped). */
export async function recordNotifeeNotification(
  notification: Notification,
  opts: { at?: number; read?: boolean } = {}
): Promise<AppNotification> {
  await whenHistoryHydrated();
  const at = opts.at ?? Date.now();
  const history = useNotificationHistory.getState();
  if (opts.read) {
    // A tap can come a day after delivery; match the recent delivery instead of adding a duplicate.
    const prefix = `${notification.id ?? 'unknown'}|`;
    const recent = history.items.find((i) => i.key.startsWith(prefix) && at - i.createdAt < 48 * 3600_000);
    if (recent) {
      history.markRead(recent.id);
      return { ...recent, read: true };
    }
  }
  return history.add({
    key: deliveryKey(notification.id, at),
    title: notification.title ?? 'Spend Hive',
    body: notification.body ?? '',
    category: categoryFromData(notification.data),
    target: targetFromData(notification.data),
    createdAt: at,
    read: opts.read,
  });
}

export function notificationTarget(notification: Notification | undefined) {
  return targetFromData(notification?.data);
}

/** Records whatever is still in the system tray (covers deliveries while the app was not running). */
export async function syncDisplayedNotifications() {
  const displayed = await notifee.getDisplayedNotifications();
  for (const d of displayed) {
    // Android reports the post time either as epoch ms or as a date string.
    const raw = d.date ? String(d.date) : '';
    const at = /^\d+$/.test(raw) ? Number(raw) : raw ? new Date(raw).getTime() : NaN;
    await recordNotifeeNotification({ ...d.notification, id: d.notification.id ?? d.id }, { at: isNaN(at) ? Date.now() : at });
  }
}

/**
 * The common entry point for app-generated notifications: shows it on Android and records it in
 * the notification center. Resolves false if notifications are not permitted (it is still recorded).
 */
export async function notify(input: {
  title: string;
  body: string;
  category: NotificationCategory;
  target?: NotificationTarget;
  id?: string;
}): Promise<boolean> {
  const id = input.id ?? `app-${generateId()}`;
  const notification: Notification = {
    id,
    title: input.title,
    body: input.body,
    data: notificationData(input.category, input.target),
    android: ANDROID_DEFAULTS,
  };
  await recordNotifeeNotification(notification);
  if (!(await hasNotificationPermission())) return false;
  await notifee.createChannel({ id: CHANNEL_ID, name: 'Reminders', importance: AndroidImportance.HIGH });
  await notifee.displayNotification(notification);
  return true;
}
