// Notifee is native code that Expo Go doesn't ship; importing '@notifee/react-native' there throws
// "native module not found" at load time. So it's only required outside Expo Go, and everything
// else imports its enums from the pure type files (no native code) via this module.
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type NotifeeModule from '@notifee/react-native';

export const notifee: typeof NotifeeModule | null =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient
    ? null
    : require('@notifee/react-native').default;

export type { Event, TimestampTrigger } from '@notifee/react-native';
export { EventType, AuthorizationStatus } from '@notifee/react-native/dist/types/Notification';
export { AndroidImportance, AndroidNotificationSetting } from '@notifee/react-native/dist/types/NotificationAndroid';
export { RepeatFrequency, TriggerType } from '@notifee/react-native/dist/types/Trigger';
