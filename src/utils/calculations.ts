import { Account, Transaction, Category } from '@/types';
import { DateRange, isDateInRange, periodKeyForMonth } from './dateUtils';

export function computeAccountBalance(account: Account, transactions: Transaction[]): number {
  let balance = account.initialBalance;
  for (const tx of transactions) {
    if (tx.type === 'EXPENSE' && tx.accountId === account.id) balance -= tx.amount;
    else if (tx.type === 'INCOME' && tx.accountId === account.id) balance += tx.amount;
    else if (tx.type === 'TRANSFER') {
      if (tx.accountId === account.id) balance -= tx.amount;
      if (tx.toAccountId === account.id) balance += tx.amount;
    }
  }
  return balance;
}

export function filterTransactionsInRange(transactions: Transaction[], range: DateRange): Transaction[] {
  return transactions.filter((t) => isDateInRange(t.date, range));
}

export function sumByType(transactions: Transaction[], type: 'EXPENSE' | 'INCOME'): number {
  return transactions.filter((t) => t.type === type).reduce((sum, t) => sum + t.amount, 0);
}

export interface CategoryTotal {
  category: Category;
  total: number;
  percent: number;
}

export function categoryTotals(
  transactions: Transaction[],
  categories: Category[],
  type: 'EXPENSE' | 'INCOME'
): CategoryTotal[] {
  const filtered = transactions.filter((t) => t.type === type);
  const grandTotal = filtered.reduce((s, t) => s + t.amount, 0);
  const map = new Map<string, number>();
  for (const t of filtered) {
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
  }
  const results: CategoryTotal[] = [];
  for (const [categoryId, total] of map.entries()) {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) continue;
    results.push({ category, total, percent: grandTotal > 0 ? (total / grandTotal) * 100 : 0 });
  }
  return results.sort((a, b) => b.total - a.total);
}

export function budgetSpentForCategory(transactions: Transaction[], categoryId: string, period: string): number {
  return transactions
    .filter((t) => t.type === 'EXPENSE' && t.categoryId === categoryId && periodKeyForMonth(new Date(t.date)) === period)
    .reduce((sum, t) => sum + t.amount, 0);
}

export function budgetProgressColor(percent: number): string {
  if (percent >= 100) return '#E86759';
  if (percent >= 75) return '#E0A94A';
  return '#50B98A';
}

export function dailyTotals(
  transactions: Transaction[],
  type: 'EXPENSE' | 'INCOME',
  days: Date[]
): { date: Date; total: number }[] {
  return days.map((date) => {
    const dayKey = date.toDateString();
    const total = transactions
      .filter((t) => t.type === type && new Date(t.date).toDateString() === dayKey)
      .reduce((sum, t) => sum + t.amount, 0);
    return { date, total };
  });
}

export interface AccountFlow {
  account: Account;
  expense: number;
  income: number;
  balance: number;
}

export function accountFlows(
  transactions: Transaction[],
  allTransactions: Transaction[],
  accounts: Account[]
): AccountFlow[] {
  return accounts
    .filter((a) => !a.archived)
    .map((account) => {
      const accTx = transactions.filter((t) => t.accountId === account.id || t.toAccountId === account.id);
      return {
        account,
        expense: sumByType(accTx.filter((t) => t.accountId === account.id), 'EXPENSE'),
        income: sumByType(accTx, 'INCOME'),
        balance: computeAccountBalance(account, allTransactions),
      };
    });
}
