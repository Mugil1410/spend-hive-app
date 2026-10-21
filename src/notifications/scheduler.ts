import {
  notifee,
  AndroidImportance,
  AndroidNotificationSetting,
  AuthorizationStatus,
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
} from './notifeeClient';
import { PermissionsAndroid, Platform } from 'react-native';
import { CashbookEntry } from '@/types';
import { NotificationSettings } from '@/store/useStore';
import { currencySymbol } from '@/utils/currency';
import { ANDROID_DEFAULTS, CHANNEL_ID, notificationData, notify } from './NotificationService';

const DAILY_ID = 'daily-expense';
// Android caps scheduled alarms per app (~500); keep the soonest ones only.
const MAX_DUE_REMINDERS = 60;

export interface ReminderInputs {
  notificationSettings: NotificationSettings;
  cashbookEntries: CashbookEntry[];
  currency: string;
}

const POST_NOTIFICATIONS = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
const needsRuntimePermission = Platform.OS === 'android' && Number(Platform.Version) >= 33;

/**
 * Whether notifications are currently allowed, without prompting. Some OEM skins (Vivo/iQOO
 * OriginOS, Xiaomi) report Notifee's status inconsistently, so the Android runtime permission
 * counts as a second source of truth.
 */
export async function hasNotificationPermission(): Promise<boolean> {
  const settings = await notifee.getNotificationSettings();
  if (settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED) return true;
  return needsRuntimePermission && (await PermissionsAndroid.check(POST_NOTIFICATIONS));
}

/** Asks for notification permission (Android 13+ shows the system prompt). Returns true if granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (await hasNotificationPermission()) return true;
  if (needsRuntimePermission) {
    const result = await PermissionsAndroid.request(POST_NOTIFICATIONS);
    if (result === PermissionsAndroid.RESULTS.GRANTED) return true;
  }
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
}

/** Whether Android lets us fire at an exact time ("Alarms & reminders" special access, Android 12+). */
export async function canScheduleExactAlarms(): Promise<boolean> {
  const settings = await notifee.getNotificationSettings();
  return settings.android.alarm === AndroidNotificationSetting.ENABLED;
}

export async function openAlarmPermissionSettings() {
  await notifee.openAlarmPermissionSettings();
}

export async function openNotificationSettings() {
  await notifee.openNotificationSettings();
}

/**
 * Shows a notification immediately on the reminders channel, so the user can check that
 * permission, channel sound/importance and the icon all work. Returns false if not permitted.
 */
export async function sendTestNotification(): Promise<boolean> {
  if (!(await requestNotificationPermission())) return false;
  return notify({
    id: `test-${Date.now()}`,
    title: 'Spend Hive test notification',
    body: 'Notifications are working. Your reminders will look like this.',
    category: 'test',
    target: { route: 'Notifications' },
  });
}

function atTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  const d = new Date(day);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

/**
 * Cancels every scheduled reminder and re-creates them from current state. Cheap enough to call
 * on any relevant change: it only touches local AlarmManager entries.
 */
export async function rescheduleReminders({ notificationSettings: s, cashbookEntries, currency }: ReminderInputs) {
  await notifee.cancelTriggerNotifications();
  if (!s.enabled) return;

  if (!(await hasNotificationPermission())) return;
  const settings = await notifee.getNotificationSettings();
  const exact = settings.android.alarm === AndroidNotificationSetting.ENABLED;

  await notifee.createChannel({ id: CHANNEL_ID, name: 'Reminders', importance: AndroidImportance.HIGH });

  const now = Date.now();
  const trigger = (date: Date, repeat?: RepeatFrequency): TimestampTrigger => ({
    type: TriggerType.TIMESTAMP,
    timestamp: date.getTime(),
    repeatFrequency: repeat,
    // Without the exact-alarm permission Android may delay delivery a bit; still fires.
    alarmManager: exact ? { allowWhileIdle: true } : undefined,
  });
  const android = ANDROID_DEFAULTS;

  if (s.dailyReminderEnabled) {
    let next = atTime(new Date(), s.dailyReminderTime);
    if (next.getTime() <= now) next.setDate(next.getDate() + 1);
    await notifee.createTriggerNotification(
      {
        id: DAILY_ID,
        title: 'Log today\'s spending',
        body: 'Take a moment to add today\'s expenses to Spend Hive.',
        data: notificationData('daily', { route: 'QuickAdd' }),
        android,
      },
      trigger(next, RepeatFrequency.DAILY)
    );
  }

  const symbol = currencySymbol(currency);
  const due: { at: Date; entry: CashbookEntry; remaining: number; installmentId: string }[] = [];
  for (const entry of cashbookEntries) {
    if (entry.type === 'LOAN' ? !s.loanDueEnabled : !s.lentDueEnabled) continue;
    if (entry.closedAt) continue; // closed entries are no longer collected/paid
    for (const inst of entry.installments) {
      if (inst.status === 'PAID') continue;
      const at = atTime(new Date(inst.dueDate), s.dailyReminderTime);
      if (at.getTime() <= now) continue;
      due.push({ at, entry, remaining: Math.max(inst.expectedAmount - inst.paidAmount, 0), installmentId: inst.id });
    }
  }
  due.sort((a, b) => a.at.getTime() - b.at.getTime());

  for (const d of due.slice(0, MAX_DUE_REMINDERS)) {
    const amount = `${symbol}${d.remaining.toLocaleString()}`;
    const isLoan = d.entry.type === 'LOAN';
    await notifee.createTriggerNotification(
      {
        id: `due-${d.installmentId}`,
        title: isLoan ? 'Loan payment due today' : 'Payment to collect today',
        body: isLoan ? `Pay ${amount} to ${d.entry.contactName}` : `${d.entry.contactName} owes you ${amount}`,
        data: notificationData(isLoan ? 'loan' : 'lent', {
          route: 'CashbookEntryDetail',
          params: { entryId: d.entry.id },
        }),
        android,
      },
      trigger(d.at)
    );
  }
}
