import notifee, {
  AndroidImportance,
  AndroidNotificationSetting,
  AuthorizationStatus,
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import { CashbookEntry } from '@/types';
import { NotificationSettings } from '@/store/useStore';
import { currencySymbol } from '@/utils/currency';

const CHANNEL_ID = 'reminders';
const DAILY_ID = 'daily-expense';
// Android caps scheduled alarms per app (~500); keep the soonest ones only.
const MAX_DUE_REMINDERS = 60;

export interface ReminderInputs {
  notificationSettings: NotificationSettings;
  cashbookEntries: CashbookEntry[];
  currency: string;
}

/** Asks for notification permission (Android 13+ shows the system prompt). Returns true if granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
}

/** Whether Android lets us fire at an exact time ("Alarms & reminders" special access, Android 12+). */
export async function canScheduleExactAlarms(): Promise<boolean> {
  const settings = await notifee.getNotificationSettings();
  return settings.android.alarm === AndroidNotificationSetting.ENABLED;
}

export function openAlarmPermissionSettings() {
  return notifee.openAlarmPermissionSettings();
}

export function openNotificationSettings() {
  return notifee.openNotificationSettings();
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

  const settings = await notifee.getNotificationSettings();
  if (settings.authorizationStatus < AuthorizationStatus.AUTHORIZED) return;
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
  const android = {
    channelId: CHANNEL_ID,
    smallIcon: 'ic_notification',
    pressAction: { id: 'default', launchActivity: 'default' },
  };

  if (s.dailyReminderEnabled) {
    let next = atTime(new Date(), s.dailyReminderTime);
    if (next.getTime() <= now) next.setDate(next.getDate() + 1);
    await notifee.createTriggerNotification(
      {
        id: DAILY_ID,
        title: 'Log today\'s spending',
        body: 'Take a moment to add today\'s expenses to SpendHive.',
        android,
      },
      trigger(next, RepeatFrequency.DAILY)
    );
  }

  const symbol = currencySymbol(currency);
  const due: { at: Date; entry: CashbookEntry; remaining: number; installmentId: string }[] = [];
  for (const entry of cashbookEntries) {
    if (entry.type === 'LOAN' ? !s.loanDueEnabled : !s.lentDueEnabled) continue;
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
        data: { entryId: d.entry.id },
        android,
      },
      trigger(d.at)
    );
  }
}
