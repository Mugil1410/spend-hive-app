import { Account, Category, Transaction, CashbookEntry, Debtor, Event } from '@/types';

interface TransactionsExportData {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  events: Event[];
  cashbookEntries: CashbookEntry[];
  debtors: Debtor[];
}

const HEADERS = ['Date', 'Transaction Type', 'Amount', 'Account', 'To Account', 'Category', 'Event', 'Person', 'Note'];

// RFC 4180 quoting: wrap in quotes when the value has a comma, quote or line break.
function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Exports only transaction-level data - no raw database tables, internal config, or
// auth/migration internals. Notes are included here (labeled) even though they're
// hidden from the in-app transaction list, since they're still meaningful export data.
export function buildTransactionsCsv(data: TransactionsExportData): string {
  const { transactions, accounts, categories, events, cashbookEntries, debtors } = data;

  const accountById = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryById = new Map(categories.map((c) => [c.id, c.name]));
  const eventById = new Map(events.map((e) => [e.id, e.name]));
  const debtorById = new Map(debtors.map((d) => [d.id, d.name]));
  const cashbookEntryById = new Map(cashbookEntries.map((e) => [e.id, e]));

  function personFor(t: Transaction): string {
    if (!t.cashbookRef) return '';
    const entry = cashbookEntryById.get(t.cashbookRef.entryId);
    if (!entry) return '';
    return (entry.debtorId ? debtorById.get(entry.debtorId) : undefined) ?? entry.contactName ?? '';
  }

  const rows = [...transactions]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((t) => [
      t.date,
      t.type,
      t.amount,
      accountById.get(t.accountId) ?? '',
      t.toAccountId ? accountById.get(t.toAccountId) ?? '' : '',
      t.type === 'TRANSFER' ? '' : categoryById.get(t.categoryId) ?? '',
      t.eventId ? eventById.get(t.eventId) ?? '' : '',
      personFor(t),
      t.note ?? '',
    ]);

  // Leading BOM so Excel opens the file as UTF-8 (non-ASCII names, ₹, etc.).
  return '﻿' + [HEADERS, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}
