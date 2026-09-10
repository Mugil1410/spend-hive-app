export type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  accountId: string;
  toAccountId?: string; // For transfers
  date: string; // ISO string
  note?: string;
  eventId?: string;
  cashbookRef?: { entryId: string; installmentId?: string }; // set when auto-created from Cashbook
}

export type AccountType = 'CASH' | 'CARD' | 'SAVINGS' | 'CUSTOM';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  icon: string;
  color: string;
  archived?: boolean;
}

export type CategoryType = 'EXPENSE' | 'INCOME';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  limit: number;
  period: string; // YYYY-MM
}

export type InstallmentStatus = 'PENDING' | 'PARTIAL' | 'PAID';

export interface CashbookInstallment {
  id: string;
  expectedAmount: number;
  paidAmount: number;
  dueDate: string; // ISO string
  status: InstallmentStatus;
}

export type CashbookType = 'LOAN' | 'LENT';

export interface CashbookEntry {
  id: string;
  type: CashbookType;
  contactName: string;
  debtorId?: string;
  accountId?: string; // account the loan/lent amount was given from/into, chosen at creation
  totalAmount: number;
  installments: CashbookInstallment[];
  createdAt: string;
  note?: string;
}

export interface Debtor {
  id: string;
  name: string;
  nameKey: string; // trimmed + lowercased, used for case-insensitive dedup
  createdAt: string;
  archived?: boolean;
}

export interface Event {
  id: string;
  name: string;
  icon: string;
  color: string;
  archived?: boolean;
}

export type DisplayRange =
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'HALF_YEARLY'
  | 'YEARLY';

export interface DisplayOptions {
  range: DisplayRange;
  carryOver: boolean;
}

export type AnalysisView =
  | 'EXPENSE_OVERVIEW'
  | 'INCOME_OVERVIEW'
  | 'EXPENSE_FLOW'
  | 'INCOME_FLOW'
  | 'ACCOUNT_ANALYSIS';
