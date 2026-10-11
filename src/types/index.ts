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
  // Set when auto-created from Cashbook. No installmentId = the entry's creation transaction;
  // installmentId + paymentId = one repayment, mirrored 1:1 by CashbookPayment.transactionId.
  cashbookRef?: { entryId: string; installmentId?: string; paymentId?: string };
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
  // Spending-limit accounts (e.g. UPI Circle): the limit is not money held. Available amount =
  // monthlyLimit - this calendar month's spending; it resets on the 1st with no transaction.
  monthlyLimit?: number;
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

// One repayment against an installment; always has exactly one linked Transaction.
export interface CashbookPayment {
  id: string;
  amount: number;
  date: string; // ISO string
  accountId: string;
  transactionId: string;
}

export interface CashbookInstallment {
  id: string;
  expectedAmount: number;
  paidAmount: number; // always untrackedPaidAmount + sum(payments) - see recalcInstallment
  dueDate: string; // ISO string
  status: InstallmentStatus;
  payments?: CashbookPayment[];
  // Paid amount from before payments were tracked that has no surviving linked transaction.
  untrackedPaidAmount?: number;
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
  // Administrative close (e.g. waiving a small remainder). Creates no transaction.
  closedAt?: string;
  closedOutstanding?: number; // remaining amount at the moment of closing
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
  completed?: boolean;
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
