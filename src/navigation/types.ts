import { NavigatorScreenParams } from '@react-navigation/native';
import { CashbookType, TransactionType } from '@/types';
import type { LockMethod } from '@/security/appLockStore';

export type BottomTabParamList = {
  Records: undefined;
  Analysis: undefined;
  Budgets: undefined;
  Accounts: undefined;
  Categories: undefined;
  Cashbook: undefined;
  Events: undefined;
  Settings: undefined;
  Preferences: undefined;
};

export type DrawerParamList = {
  MainTabs: NavigatorScreenParams<BottomTabParamList> | undefined;
};

export type RootStackParamList = {
  Drawer: NavigatorScreenParams<DrawerParamList> | undefined;
  QuickAdd: { transactionId?: string; type?: TransactionType; eventId?: string } | undefined;
  AccountForm: { accountId?: string } | undefined;
  CategoryForm: { categoryId?: string; type?: 'EXPENSE' | 'INCOME' } | undefined;
  CashbookForm: { type: CashbookType; entryId?: string };
  CashbookEntryDetail: { entryId: string };
  // With paymentId: edit that existing payment (and its linked transaction) instead of adding one.
  RecordPayment: { entryId: string; installmentId: string; paymentId?: string };
  FilteredTransactions: { accountId?: string; categoryId?: string; title: string };
  Debtors: undefined;
  DebtorForm: { debtorId?: string } | undefined;
  // Unlocks a password-encrypted backup picked for restore.
  BackupPassword: undefined;
  // Asks for a password and writes an encrypted backup.
  BackupEncrypt: undefined;
  EventForm: { eventId?: string } | undefined;
  EventDetail: { eventId: string };
  Notifications: undefined;
  SystemAnalytics: undefined;
  AppLockSettings: undefined;
  // enable: create a credential; change/disable: verify the current one first.
  AppLockSetup: { intent: 'enable' | 'change' | 'disable'; method?: LockMethod };
};
