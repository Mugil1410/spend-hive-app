// Single import point for Notifee, so the rest of the app pulls its enums from the pure type files.
export { default as notifee } from '@notifee/react-native';

export type { Event, TimestampTrigger } from '@notifee/react-native';
export { EventType, AuthorizationStatus } from '@notifee/react-native/dist/types/Notification';
export { AndroidImportance, AndroidNotificationSetting } from '@notifee/react-native/dist/types/NotificationAndroid';
export { RepeatFrequency, TriggerType } from '@notifee/react-native/dist/types/Trigger';
