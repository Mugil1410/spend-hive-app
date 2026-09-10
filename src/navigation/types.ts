import { NavigatorScreenParams } from '@react-navigation/native';
import { CashbookType, TransactionType } from '@/types';

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
  Drawer: undefined;
  QuickAdd: { transactionId?: string; type?: TransactionType; eventId?: string } | undefined;
  AccountForm: { accountId?: string } | undefined;
  CategoryForm: { categoryId?: string; type?: 'EXPENSE' | 'INCOME' } | undefined;
  CashbookForm: { type: CashbookType; entryId?: string };
  CashbookEntryDetail: { entryId: string };
  RecordPayment: { entryId: string; installmentId: string };
  FilteredTransactions: { accountId?: string; categoryId?: string; title: string };
  Debtors: undefined;
  DebtorForm: { debtorId?: string } | undefined;
  BackupPassword: { mode: 'backup' | 'restore' };
  EventForm: { eventId?: string } | undefined;
  EventDetail: { eventId: string };
};
