import { Account, Category, Transaction, Budget, CashbookEntry } from '@/types';
import seedData from './seedData.json';

export const seedAccounts: Account[] = seedData.accounts as Account[];
export const seedCategories: Category[] = seedData.categories as Category[];
export const seedTransactions: Transaction[] = seedData.transactions as Transaction[];
export const seedBudgets: Budget[] = seedData.budgets as Budget[];
export const seedCashbookEntries: CashbookEntry[] = seedData.cashbookEntries as CashbookEntry[];
