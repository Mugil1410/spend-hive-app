import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { appStorage } from './storage';
import { CURRENT_VERSION, runMigrations } from './migrations';
import { generateId } from '@/utils/id';
import {
  Account,
  Category,
  Transaction,
  Budget,
  CashbookEntry,
  CashbookInstallment,
  CashbookPayment,
  CashbookType,
  Debtor,
  Event,
} from '@/types';
import {
  Ledger,
  applyCloseEntry,
  applyDeleteEntry,
  applyDeletePayment,
  applyDeleteTransaction,
  applyRecordPayment,
  applyReopenEntry,
  applyUpdateEntry,
  applyUpdatePayment,
  applyUpdateTransaction,
  cashbookAutoNote,
  computeInstallmentStatus,
  linkCashbookPayments,
} from './cashbookSync';

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
  debtors: Debtor[];
  events: Event[];
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
  // Cashbook-linked transactions sync back into their entry. Returns false when refused
  // (an entry's creation transaction can only be removed by deleting the entry).
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, 'id'>>) => void;
  deleteTransaction: (id: string) => boolean;

  // Budgets
  setBudget: (categoryId: string, period: string, limit: number) => void;
  removeBudget: (categoryId: string, period: string) => void;
  copyBudgetsForward: (fromPeriod: string, toPeriod: string) => void;

  // Cashbook
  addCashbookEntry: (entry: {
    type: CashbookType;
    contactName: string;
    debtorId: string;
    accountId: string;
    totalAmount: number;
    installments: Array<{ expectedAmount: number; dueDate: string }>;
    note?: string;
    createdAt?: string;
  }) => string;
  updateCashbookEntry: (
    id: string,
    patch: Partial<Pick<CashbookEntry, 'contactName' | 'debtorId' | 'note' | 'createdAt'>>
  ) => void;
  deleteCashbookEntry: (id: string, options?: { deleteTransactions?: boolean }) => void;
  updateInstallmentDueDate: (entryId: string, installmentId: string, dueDate: string) => void;
  updateInstallmentAmount: (entryId: string, installmentId: string, expectedAmount: number) => void;
  recordInstallmentPayment: (
    entryId: string,
    installmentId: string,
    paymentAmount: number,
    accountId: string,
    date?: string
  ) => boolean;
  updateCashbookPayment: (
    entryId: string,
    installmentId: string,
    paymentId: string,
    patch: Partial<Pick<CashbookPayment, 'amount' | 'date' | 'accountId'>>
  ) => boolean;
  deleteCashbookPayment: (entryId: string, installmentId: string, paymentId: string) => boolean;
  // Administrative close/reopen of an outstanding balance - never touches transactions.
  closeCashbookEntry: (id: string) => boolean;
  reopenCashbookEntry: (id: string) => boolean;

  // Debtors
  findOrCreateDebtor: (name: string) => string;
  updateDebtor: (id: string, patch: Partial<Omit<Debtor, 'id'>>) => void;
  deleteDebtor: (id: string) => void;

  // Events
  addEvent: (event: Omit<Event, 'id'>) => string;
  updateEvent: (id: string, patch: Partial<Omit<Event, 'id'>>) => void;
  deleteEvent: (id: string) => void;

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
    debtors?: Debtor[];
    events?: Event[];
    themeMode?: ThemeMode;
    currency?: string;
    notificationSettings?: NotificationSettings;
  }) => void;

  // Preferences
  setThemeMode: (mode: ThemeMode) => void;
  setCurrency: (code: string) => void;
  updateNotificationSettings: (patch: Partial<NotificationSettings>) => void;
}

function ledgerOf(state: Pick<AppState, 'transactions' | 'cashbookEntries'>): Ledger {
  return { transactions: state.transactions, cashbookEntries: state.cashbookEntries };
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      accounts: [],
      categories: [],
      transactions: [],
      budgets: [],
      cashbookEntries: [],
      debtors: [],
      events: [],
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
        set((state) => applyUpdateTransaction(ledgerOf(state), id, patch));
      },
      deleteTransaction: (id) => {
        let deleted = false;
        set((state) => {
          const result = applyDeleteTransaction(ledgerOf(state), id);
          deleted = result.deleted;
          return result.deleted ? result.ledger : state;
        });
        return deleted;
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
      copyBudgetsForward: (fromPeriod, toPeriod) => {
        set((state) => {
          const fromBudgets = state.budgets.filter((b) => b.period === fromPeriod);
          const toBudgetsByCategory = new Map(
            state.budgets.filter((b) => b.period === toPeriod).map((b) => [b.categoryId, b])
          );
          const untouched = state.budgets.filter((b) => b.period !== toPeriod);
          const copied = fromBudgets.map((b) => {
            const existing = toBudgetsByCategory.get(b.categoryId);
            return { id: existing?.id ?? generateId(), categoryId: b.categoryId, period: toPeriod, limit: b.limit };
          });
          return { budgets: [...untouched, ...copied] };
        });
      },

      addCashbookEntry: ({ type, contactName, debtorId, accountId, totalAmount, installments, note, createdAt }) => {
        const id = generateId();
        const builtInstallments: CashbookInstallment[] = installments.map((i) => ({
          id: generateId(),
          expectedAmount: i.expectedAmount,
          paidAmount: 0,
          dueDate: i.dueDate,
          status: 'PENDING',
        }));
        const resolvedCreatedAt = createdAt ?? new Date().toISOString();
        const entry: CashbookEntry = {
          id,
          type,
          contactName,
          debtorId,
          accountId,
          totalAmount,
          installments: builtInstallments,
          createdAt: resolvedCreatedAt,
          note,
        };

        // Creation-time transaction: a LOAN brings money in (INCOME), a LENT sends
        // money out (EXPENSE) - immediately, separate from later repayment transactions.
        const state = get();
        const creationCategoryId =
          type === 'LOAN'
            ? ensureCategory(state, 'INCOME', 'Loan Received', 'cash-plus', '#50B98A')
            : ensureCategory(state, 'EXPENSE', 'Money Lent', 'hand-coin-outline', '#E86759');
        const creationTransaction: Transaction = {
          id: generateId(),
          amount: totalAmount,
          type: type === 'LOAN' ? 'INCOME' : 'EXPENSE',
          categoryId: creationCategoryId,
          accountId,
          date: resolvedCreatedAt,
          note: cashbookAutoNote(type, 'creation', contactName),
          cashbookRef: { entryId: id },
        };

        set((s) => ({
          cashbookEntries: [...s.cashbookEntries, entry],
          transactions: [...s.transactions, creationTransaction],
        }));
        return id;
      },
      updateCashbookEntry: (id, patch) => {
        set((state) => applyUpdateEntry(ledgerOf(state), id, patch));
      },
      deleteCashbookEntry: (id, options) => {
        set((state) => applyDeleteEntry(ledgerOf(state), id, options?.deleteTransactions ?? false));
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

      recordInstallmentPayment: (entryId, installmentId, paymentAmount, accountId, date) => {
        const state = get();
        const entry = state.cashbookEntries.find((e) => e.id === entryId);
        if (!entry || entry.closedAt) return false;

        // Category used for auto-generated cashbook repayment transactions.
        const categoryId =
          entry.type === 'LOAN'
            ? ensureCategory(state, 'EXPENSE', 'Loan Payment', 'hand-coin', '#E86759')
            : ensureCategory(state, 'INCOME', 'Debt Collection', 'cash-refund', '#50B98A');

        // Payment record + its transaction land in one update, built from the latest state.
        let recorded = false;
        set((s) => {
          const next = applyRecordPayment(
            ledgerOf(s),
            { entryId, installmentId, amount: paymentAmount, accountId, date: date ?? new Date().toISOString(), categoryId },
            generateId
          );
          recorded = !!next;
          return next ?? s;
        });
        return recorded;
      },
      updateCashbookPayment: (entryId, installmentId, paymentId, patch) => {
        let updated = false;
        set((s) => {
          const next = applyUpdatePayment(ledgerOf(s), entryId, installmentId, paymentId, patch);
          updated = !!next;
          return next ?? s;
        });
        return updated;
      },
      deleteCashbookPayment: (entryId, installmentId, paymentId) => {
        let deleted = false;
        set((s) => {
          const next = applyDeletePayment(ledgerOf(s), entryId, installmentId, paymentId);
          deleted = !!next;
          return next ?? s;
        });
        return deleted;
      },
      closeCashbookEntry: (id) => {
        let closed = false;
        set((s) => {
          const next = applyCloseEntry(ledgerOf(s), id, new Date().toISOString());
          closed = !!next;
          return next ?? s;
        });
        return closed;
      },
      reopenCashbookEntry: (id) => {
        let reopened = false;
        set((s) => {
          const next = applyReopenEntry(ledgerOf(s), id);
          reopened = !!next;
          return next ?? s;
        });
        return reopened;
      },

      findOrCreateDebtor: (name) => {
        const key = normalizeDebtorName(name);
        const state = get();
        const existing = state.debtors.find((d) => d.nameKey === key);
        if (existing) return existing.id;
        const id = generateId();
        const debtor: Debtor = { id, name: name.trim(), nameKey: key, createdAt: new Date().toISOString() };
        set((s) => ({ debtors: [...s.debtors, debtor] }));
        return id;
      },
      updateDebtor: (id, patch) => {
        set((state) => ({
          debtors: state.debtors.map((d) =>
            d.id === id
              ? { ...d, ...patch, nameKey: patch.name !== undefined ? normalizeDebtorName(patch.name) : d.nameKey }
              : d
          ),
        }));
      },
      deleteDebtor: (id) => {
        set((state) => ({
          debtors: state.debtors.map((d) => (d.id === id ? { ...d, archived: true } : d)),
        }));
      },

      addEvent: (event) => {
        const id = generateId();
        set((state) => ({ events: [...state.events, { ...event, id }] }));
        return id;
      },
      updateEvent: (id, patch) => {
        set((state) => ({
          events: state.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        }));
      },
      deleteEvent: (id) => {
        set((state) => ({ events: state.events.map((e) => (e.id === id ? { ...e, archived: true } : e)) }));
      },

      resetAllData: () => {
        set({
          accounts: [],
          categories: [],
          transactions: [],
          budgets: [],
          cashbookEntries: [],
          debtors: [],
          events: [],
        });
      },
      deleteAllTransactions: () => {
        set({ transactions: [] });
      },

      importData: ({
        accounts,
        categories,
        transactions,
        budgets,
        cashbookEntries,
        debtors,
        events,
        themeMode,
        currency,
        notificationSettings,
      }) => {
        // Backups from before payment tracking get the same backfill as the v4 migration.
        const linked = linkCashbookPayments({ transactions, cashbookEntries }, generateId);
        set((state) => ({
          accounts,
          categories,
          transactions: linked.transactions,
          budgets,
          cashbookEntries: linked.cashbookEntries,
          debtors: debtors ?? state.debtors,
          events: events ?? state.events,
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
      version: CURRENT_VERSION,
      migrate: (persistedState, version) => runMigrations(persistedState, version) as AppState,
      partialize: (state) => ({
        accounts: state.accounts,
        categories: state.categories,
        transactions: state.transactions,
        budgets: state.budgets,
        cashbookEntries: state.cashbookEntries,
        debtors: state.debtors,
        events: state.events,
        themeMode: state.themeMode,
        currency: state.currency,
        notificationSettings: state.notificationSettings,
      }),
    }
  )
);

function ensureCategory(state: AppState, type: 'EXPENSE' | 'INCOME', name: string, icon: string, color: string): string {
  const existing = state.categories.find((c) => c.type === type && c.name === name);
  if (existing) return existing.id;
  const id = generateId();
  const category: Category = { id, name, type, icon, color };
  useStore.setState((s) => ({ categories: [...s.categories, category] }));
  return id;
}

function normalizeDebtorName(name: string): string {
  return name.trim().toLowerCase();
}
