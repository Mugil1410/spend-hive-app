import * as XLSX from 'xlsx';
import { Account, Category, Transaction, Budget, CashbookEntry } from '@/types';

interface ExportData {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  cashbookEntries: CashbookEntry[];
}

export function buildExportWorkbookBytes(data: ExportData): Uint8Array {
  const { accounts, categories, transactions, budgets, cashbookEntries } = data;

  const accountById = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryById = new Map(categories.map((c) => [c.id, c.name]));

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      accounts.map((a) => ({
        Name: a.name,
        Type: a.type,
        'Initial Balance': a.initialBalance,
        Archived: a.archived ? 'Yes' : 'No',
      }))
    ),
    'Accounts'
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(categories.map((c) => ({ Name: c.name, Type: c.type }))),
    'Categories'
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      transactions.map((t) => ({
        Date: t.date,
        Type: t.type,
        Category: categoryById.get(t.categoryId) ?? '',
        Account: accountById.get(t.accountId) ?? '',
        'To Account': t.toAccountId ? accountById.get(t.toAccountId) ?? '' : '',
        Amount: t.amount,
        Note: t.note ?? '',
      }))
    ),
    'Transactions'
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      budgets.map((b) => ({
        Category: categoryById.get(b.categoryId) ?? '',
        Period: b.period,
        Limit: b.limit,
      }))
    ),
    'Budgets'
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      cashbookEntries.map((e) => ({
        Contact: e.contactName,
        Type: e.type,
        'Total Amount': e.totalAmount,
        'Created At': e.createdAt,
        Note: e.note ?? '',
      }))
    ),
    'Cashbook Entries'
  );

  const installmentRows = cashbookEntries.flatMap((e) =>
    e.installments.map((i) => ({
      Contact: e.contactName,
      Type: e.type,
      'Due Date': i.dueDate,
      'Expected Amount': i.expectedAmount,
      'Paid Amount': i.paidAmount,
      Status: i.status,
    }))
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(installmentRows), 'Cashbook Installments');

  const bytes = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}
