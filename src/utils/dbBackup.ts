import { Account, Category, Transaction, Budget, CashbookEntry, Debtor, Event } from '@/types';
import { ThemeMode, NotificationSettings } from '@/store/useStore';

export const DB_BACKUP_VERSION = 2;

export interface DbBackup {
  version: number;
  exportedAt: string;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  cashbookEntries: CashbookEntry[];
  debtors: Debtor[];
  events: Event[];
  themeMode?: ThemeMode;
  currency?: string;
  notificationSettings?: NotificationSettings;
}

export function buildDbBackupJson(data: Omit<DbBackup, 'version' | 'exportedAt'>): string {
  const backup: DbBackup = {
    version: DB_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    ...data,
  };
  return JSON.stringify(backup, null, 2);
}

export function parseDbBackupJson(text: string): DbBackup {
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object') throw new Error('Invalid backup file');
  if (!Array.isArray(data.accounts) || !Array.isArray(data.categories) || !Array.isArray(data.transactions)) {
    throw new Error('This file is not a SpendHive DB backup');
  }
  return {
    version: data.version ?? DB_BACKUP_VERSION,
    exportedAt: data.exportedAt ?? new Date().toISOString(),
    accounts: data.accounts,
    categories: data.categories,
    transactions: data.transactions,
    budgets: Array.isArray(data.budgets) ? data.budgets : [],
    cashbookEntries: Array.isArray(data.cashbookEntries) ? data.cashbookEntries : [],
    debtors: Array.isArray(data.debtors) ? data.debtors : [],
    events: Array.isArray(data.events) ? data.events : [],
    themeMode: data.themeMode,
    currency: data.currency,
    notificationSettings: data.notificationSettings,
  };
}
