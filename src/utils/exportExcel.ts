import * as XLSX from 'xlsx';
import { Account, Category, Transaction, CashbookEntry, Debtor, Event } from '@/types';

interface TransactionsExportData {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  events: Event[];
  cashbookEntries: CashbookEntry[];
  debtors: Debtor[];
}

// Exports only transaction-level data - no raw database tables, internal config, or
// auth/migration internals. Notes are included here (labeled) even though they're
// hidden from the in-app transaction list, since they're still meaningful export data.
export function buildTransactionsWorkbookBytes(data: TransactionsExportData): Uint8Array {
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
    .map((t) => ({
      Date: t.date,
      'Transaction Type': t.type,
      Amount: t.amount,
      Account: accountById.get(t.accountId) ?? '',
      'To Account': t.toAccountId ? accountById.get(t.toAccountId) ?? '' : '',
      Category: t.type === 'TRANSFER' ? '' : categoryById.get(t.categoryId) ?? '',
      Event: t.eventId ? eventById.get(t.eventId) ?? '' : '',
      Person: personFor(t),
      Note: t.note ?? '',
    }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Transactions');
  const bytes = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}
