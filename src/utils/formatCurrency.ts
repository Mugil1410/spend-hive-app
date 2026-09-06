import { useStore } from '@/store/useStore';
import { currencySymbol } from './currency';

function formatGroupedAmount(amount: number, currencyCode: string): string {
  const locale = currencyCode === 'INR' ? 'en-IN' : 'en-US';
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export function formatCurrency(amount: number, options?: { withSign?: boolean }): string {
  const currency = useStore.getState().currency;
  const symbol = currencySymbol(currency);
  const abs = formatGroupedAmount(Math.abs(amount), currency);
  const sign = options?.withSign ? (amount < 0 ? '-' : amount > 0 ? '+' : '') : amount < 0 ? '-' : '';
  return `${sign}${symbol}${abs}`;
}

export function formatSignedAmount(amount: number, type: 'EXPENSE' | 'INCOME' | 'TRANSFER'): string {
  const currency = useStore.getState().currency;
  const symbol = currencySymbol(currency);
  const abs = formatGroupedAmount(Math.abs(amount), currency);
  const sign = type === 'EXPENSE' ? '-' : type === 'INCOME' ? '+' : '';
  return `${sign}${symbol}${abs}`;
}
