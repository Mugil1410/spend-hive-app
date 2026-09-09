import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { appStorage } from './storage';
import { generateId } from '@/utils/id';
import {
  Account,
  Category,
  Transaction,
  Budget,
  CashbookEntry,
  CashbookInstallment,
  CashbookType,
  TransactionType,
} from '@/types';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface NotificationSettings {
  enabled: boolean;
  loanDueEnabled: boolean;
  lentDueEnabled: boolean;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string; // 'HH:mm'
}

interface AppState {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  cashbookEntries: CashbookEntry[];
  themeMode: ThemeMode;
  currency: string;
  notificationSettings: NotificationSettings;

  // Accounts
  addAccount: (account: Omit<Account, 'id'>) => string;
  updateAccount: (id: string, patch: Partial<Omit<Account, 'id'>>) => void;
  deleteAccount: (id: string) => void;

  // Categories
  addCategory: (category: Omit<Category, 'id'>) => string;
  updateCategory: (id: string, patch: Partial<Omit<Category, 'id'>>) => void;
  deleteCategory: (id: string) => void;

  // Transactions
  addTransaction: (tx: Omit<Transaction, 'id'>) => string;
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, 'id'>>) => void;
  deleteTransaction: (id: string) => void;

  // Budgets
  setBudget: (categoryId: string, period: string, limit: number) => void;
  removeBudget: (categoryId: string, period: string) => void;

  // Cashbook
  addCashbookEntry: (entry: {
    type: CashbookType;
    contactName: string;
    totalAmount: number;
    installments: Array<{ expectedAmount: number; dueDate: string }>;
    note?: string;
    createdAt?: string;
  }) => string;
  updateCashbookEntry: (id: string, patch: Partial<Pick<CashbookEntry, 'contactName' | 'note' | 'createdAt'>>) => void;
  deleteCashbookEntry: (id: string) => void;
  updateInstallmentDueDate: (entryId: string, installmentId: string, dueDate: string) => void;
  updateInstallmentAmount: (entryId: string, installmentId: string, expectedAmount: number) => void;
  recordInstallmentPayment: (
    entryId: string,
    installmentId: string,
    paymentAmount: number,
    accountId: string
  ) => void;

  // Reset / Delete
  resetAllData: () => void;
  deleteAllTransactions: () => void;

  // Import
  importData: (data: {
    accounts: Account[];
    categories: Category[];
    transactions: Transaction[];
    budgets: Budget[];
    cashbookEntries: CashbookEntry[];
    themeMode?: ThemeMode;
    currency?: string;
    notificationSettings?: NotificationSettings;
  }) => void;

  // Preferences
  setThemeMode: (mode: ThemeMode) => void;
  setCurrency: (code: string) => void;
  updateNotificationSettings: (patch: Partial<NotificationSettings>) => void;
}

function computeInstallmentStatus(expected: number, paid: number): CashbookInstallment['status'] {
  if (paid <= 0) return 'PENDING';
  if (paid >= expected) return 'PAID';
  return 'PARTIAL';
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      accounts: [],
      categories: [],
      transactions: [],
      budgets: [],
      cashbookEntries: [],
      themeMode: 'dark',
      currency: 'INR',
      notificationSettings: {
        enabled: false,
        loanDueEnabled: true,
        lentDueEnabled: true,
        dailyReminderEnabled: false,
        dailyReminderTime: '20:00',
      },

      addAccount: (account) => {
        const id = generateId();
        set((state) => ({ accounts: [...state.accounts, { ...account, id }] }));
        return id;
      },
      updateAccount: (id, patch) => {
        set((state) => ({
          accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        }));
      },
      deleteAccount: (id) => {
        set((state) => ({
          accounts: state.accounts.map((a) => (a.id === id ? { ...a, archived: true } : a)),
        }));
      },

      addCategory: (category) => {
        const id = generateId();
        set((state) => ({ categories: [...state.categories, { ...category, id }] }));
        return id;
      },
      updateCategory: (id, patch) => {
        set((state) => ({
          categories: state.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }));
      },
      deleteCategory: (id) => {
        set((state) => ({ categories: state.categories.filter((c) => c.id !== id) }));
      },

      addTransaction: (tx) => {
        const id = generateId();
        set((state) => ({ transactions: [...state.transactions, { ...tx, id }] }));
        return id;
      },
      updateTransaction: (id, patch) => {
        set((state) => ({
          transactions: state.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        }));
      },
      deleteTransaction: (id) => {
        set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }));
      },

      setBudget: (categoryId, period, limit) => {
        set((state) => {
          const existing = state.budgets.find((b) => b.categoryId === categoryId && b.period === period);
          if (existing) {
            return {
              budgets: state.budgets.map((b) => (b.id === existing.id ? { ...b, limit } : b)),
            };
          }
          return {
            budgets: [...state.budgets, { id: generateId(), categoryId, period, limit }],
          };
        });
      },
      removeBudget: (categoryId, period) => {
        set((state) => ({
          budgets: state.budgets.filter((b) => !(b.categoryId === categoryId && b.period === period)),
        }));
      },

      addCashbookEntry: ({ type, contactName, totalAmount, installments, note, createdAt }) => {
        const id = generateId();
        const builtInstallments: CashbookInstallment[] = installments.map((i) => ({
          id: generateId(),
          expectedAmount: i.expectedAmount,
          paidAmount: 0,
          dueDate: i.dueDate,
          status: 'PENDING',
        }));
        const entry: CashbookEntry = {
          id,
          type,
          contactName,
          totalAmount,
          installments: builtInstallments,
          createdAt: createdAt ?? new Date().toISOString(),
          note,
        };
        set((state) => ({ cashbookEntries: [...state.cashbookEntries, entry] }));
        return id;
      },
      updateCashbookEntry: (id, patch) => {
        set((state) => ({
          cashbookEntries: state.cashbookEntries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        }));
      },
      deleteCashbookEntry: (id) => {
        set((state) => ({ cashbookEntries: state.cashbookEntries.filter((e) => e.id !== id) }));
      },
      updateInstallmentDueDate: (entryId, installmentId, dueDate) => {
        set((state) => ({
          cashbookEntries: state.cashbookEntries.map((e) =>
            e.id !== entryId
              ? e
              : {
                  ...e,
                  installments: e.installments.map((i) => (i.id === installmentId ? { ...i, dueDate } : i)),
                }
          ),
        }));
      },
      updateInstallmentAmount: (entryId, installmentId, expectedAmount) => {
        set((state) => ({
          cashbookEntries: state.cashbookEntries.map((e) => {
            if (e.id !== entryId) return e;
            const installments = e.installments.map((i) =>
              i.id === installmentId
                ? { ...i, expectedAmount, status: computeInstallmentStatus(expectedAmount, i.paidAmount) }
                : i
            );
            return { ...e, installments, totalAmount: installments.reduce((s, i) => s + i.expectedAmount, 0) };
          }),
        }));
      },

      recordInstallmentPayment: (entryId, installmentId, paymentAmount, accountId) => {
        const state = get();
        const entry = state.cashbookEntries.find((e) => e.id === entryId);
        if (!entry) return;
        const installment = entry.installments.find((i) => i.id === installmentId);
        if (!installment) return;

        const remaining = installment.expectedAmount - installment.paidAmount;
        const applied = Math.min(paymentAmount, remaining > 0 ? paymentAmount : paymentAmount);
        const newPaidAmount = installment.paidAmount + applied;

        // Category used for auto-generated cashbook transactions.
        const categoryId = entry.type === 'LOAN' ? ensureCashbookCategory(state, 'EXPENSE') : ensureCashbookCategory(state, 'INCOME');

        const txType: TransactionType = entry.type === 'LOAN' ? 'EXPENSE' : 'INCOME';
        const txId = generateId();
        const transaction: Transaction = {
          id: txId,
          amount: applied,
          type: txType,
          categoryId,
          accountId,
          date: new Date().toISOString(),
          note: `${entry.type === 'LOAN' ? 'Loan payment to' : 'Payment received from'} ${entry.contactName}`,
          cashbookRef: { entryId, installmentId },
        };

        set((s) => ({
          transactions: [...s.transactions, transaction],
          cashbookEntries: s.cashbookEntries.map((e) =>
            e.id !== entryId
              ? e
              : {
                  ...e,
                  installments: e.installments.map((i) =>
                    i.id !== installmentId
                      ? i
                      : {
                          ...i,
                          paidAmount: newPaidAmount,
                          status: computeInstallmentStatus(i.expectedAmount, newPaidAmount),
                        }
                  ),
                }
          ),
        }));
      },

      resetAllData: () => {
        set({
          accounts: [],
          categories: [],
          transactions: [],
          budgets: [],
          cashbookEntries: [],
        });
      },
      deleteAllTransactions: () => {
        set({ transactions: [] });
      },

      importData: ({ accounts, categories, transactions, budgets, cashbookEntries, themeMode, currency, notificationSettings }) => {
        set((state) => ({
          accounts,
          categories,
          transactions,
          budgets,
          cashbookEntries,
          themeMode: themeMode ?? state.themeMode,
          currency: currency ?? state.currency,
          notificationSettings: notificationSettings ?? state.notificationSettings,
        }));
      },

      setThemeMode: (mode) => set({ themeMode: mode }),
      setCurrency: (code) => set({ currency: code }),
      updateNotificationSettings: (patch) => {
        set((state) => ({ notificationSettings: { ...state.notificationSettings, ...patch } }));
      },
    }),
    {
      name: 'mymoney-pro-store',
      storage: createJSONStorage(() => appStorage),
      partialize: (state) => ({
        accounts: state.accounts,
        categories: state.categories,
        transactions: state.transactions,
        budgets: state.budgets,
        cashbookEntries: state.cashbookEntries,
        themeMode: state.themeMode,
        currency: state.currency,
        notificationSettings: state.notificationSettings,
      }),
    }
  )
);

function ensureCashbookCategory(state: AppState, type: 'EXPENSE' | 'INCOME'): string {
  const name = type === 'EXPENSE' ? 'Loan Payment' : 'Debt Collection';
  const existing = state.categories.find((c) => c.type === type && c.name === name);
  if (existing) return existing.id;
  const id = generateId();
  const category: Category = {
    id,
    name,
    type,
    icon: type === 'EXPENSE' ? 'hand-coin' : 'cash-refund',
    color: type === 'EXPENSE' ? '#E86759' : '#50B98A',
  };
  useStore.setState((s) => ({ categories: [...s.categories, category] }));
  return id;
}
