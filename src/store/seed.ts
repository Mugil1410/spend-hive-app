import { Account, Category, Transaction, Budget, CashbookEntry } from '@/types';

// Fresh installs start empty. Use Settings > Import DB File to restore a
// previously exported backup instead of shipping personal data in source.
export const seedAccounts: Account[] = [];
export const seedCategories: Category[] = [];
export const seedTransactions: Transaction[] = [];
export const seedBudgets: Budget[] = [];
export const seedCashbookEntries: CashbookEntry[] = [];
