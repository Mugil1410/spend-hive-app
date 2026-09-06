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
  cashbookRef?: { entryId: string; installmentId: string }; // set when auto-created from Cashbook
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
  totalAmount: number;
  installments: CashbookInstallment[];
  createdAt: string;
  note?: string;
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
