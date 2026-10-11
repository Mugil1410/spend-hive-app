import type { CashbookEntry, CashbookInstallment, CashbookPayment, CashbookType, Transaction } from '@/types';

// Pure Cashbook <-> Transaction bookkeeping. Every function takes the current ledger and
// returns a new one (or null when the operation is not allowed), so the store can apply
// all related record changes in a single `set` - the change lands entirely or not at all.
//
// Linking model: a Transaction's `cashbookRef` points at its entry. The entry's creation
// transaction has no installmentId; each repayment has installmentId + paymentId and is
// mirrored by exactly one CashbookPayment whose transactionId points back at it.

export interface Ledger {
  transactions: Transaction[];
  cashbookEntries: CashbookEntry[];
}

export type IdFactory = () => string;

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeInstallmentStatus(expected: number, paid: number): CashbookInstallment['status'] {
  if (paid <= 0) return 'PENDING';
  if (paid >= expected) return 'PAID';
  return 'PARTIAL';
}

// paidAmount is derived, never edited directly: untracked legacy amount + linked payments.
export function recalcInstallment(inst: CashbookInstallment): CashbookInstallment {
  const tracked = (inst.payments ?? []).reduce((s, p) => s + p.amount, 0);
  const paidAmount = Math.max(0, round2((inst.untrackedPaidAmount ?? 0) + tracked));
  return { ...inst, paidAmount, status: computeInstallmentStatus(inst.expectedAmount, paidAmount) };
}

export function entryPaid(entry: CashbookEntry): number {
  return entry.installments.reduce((s, i) => s + i.paidAmount, 0);
}

export function entryRemaining(entry: CashbookEntry): number {
  return round2(entry.totalAmount - entryPaid(entry));
}

export function isEntryClosed(entry: CashbookEntry): boolean {
  return !!entry.closedAt;
}

// What is still actively owed. A closed entry owes nothing, whatever was left at closing.
export function entryOutstanding(entry: CashbookEntry): number {
  return isEntryClosed(entry) ? 0 : Math.max(0, entryRemaining(entry));
}

export function canCloseEntry(entry: CashbookEntry): boolean {
  return !isEntryClosed(entry) && entryRemaining(entry) > 0;
}

export function cashbookAutoNote(type: CashbookType, kind: 'creation' | 'payment', name: string): string {
  if (kind === 'creation') return `${type === 'LOAN' ? 'Loan from' : 'Lent to'} ${name}`;
  return `${type === 'LOAN' ? 'Loan payment to' : 'Payment received from'} ${name}`;
}

export function isCashbookCreationTx(tx: Transaction): boolean {
  return !!tx.cashbookRef && !tx.cashbookRef.installmentId;
}

function mapInstallment(
  entries: CashbookEntry[],
  entryId: string,
  installmentId: string,
  fn: (inst: CashbookInstallment) => CashbookInstallment
): CashbookEntry[] {
  return entries.map((e) =>
    e.id !== entryId
      ? e
      : { ...e, installments: e.installments.map((i) => (i.id === installmentId ? recalcInstallment(fn(i)) : i)) }
  );
}

function findPayment(ledger: Ledger, entryId: string, installmentId: string, paymentId: string) {
  const entry = ledger.cashbookEntries.find((e) => e.id === entryId);
  const inst = entry?.installments.find((i) => i.id === installmentId);
  const payment = inst?.payments?.find((p) => p.id === paymentId);
  return entry && inst && payment ? { entry, inst, payment } : null;
}

export function applyRecordPayment(
  ledger: Ledger,
  args: { entryId: string; installmentId: string; amount: number; accountId: string; date: string; categoryId: string },
  newId: IdFactory
): Ledger | null {
  const { entryId, installmentId, amount, accountId, date, categoryId } = args;
  const entry = ledger.cashbookEntries.find((e) => e.id === entryId);
  if (!entry || isEntryClosed(entry) || !(amount > 0) || !accountId) return null;
  if (!entry.installments.some((i) => i.id === installmentId)) return null;

  const payment: CashbookPayment = { id: newId(), amount, date, accountId, transactionId: newId() };
  const transaction: Transaction = {
    id: payment.transactionId,
    amount,
    type: entry.type === 'LOAN' ? 'EXPENSE' : 'INCOME',
    categoryId,
    accountId,
    date,
    note: cashbookAutoNote(entry.type, 'payment', entry.contactName),
    cashbookRef: { entryId, installmentId, paymentId: payment.id },
  };
  return {
    transactions: [...ledger.transactions, transaction],
    cashbookEntries: mapInstallment(ledger.cashbookEntries, entryId, installmentId, (i) => ({
      ...i,
      payments: [...(i.payments ?? []), payment],
    })),
  };
}

export function applyUpdatePayment(
  ledger: Ledger,
  entryId: string,
  installmentId: string,
  paymentId: string,
  patch: Partial<Pick<CashbookPayment, 'amount' | 'date' | 'accountId'>>
): Ledger | null {
  const found = findPayment(ledger, entryId, installmentId, paymentId);
  if (!found || (patch.amount !== undefined && !(patch.amount > 0))) return null;
  const next: CashbookPayment = { ...found.payment, ...patch };
  return {
    transactions: ledger.transactions.map((t) =>
      t.id === next.transactionId ? { ...t, amount: next.amount, date: next.date, accountId: next.accountId } : t
    ),
    cashbookEntries: mapInstallment(ledger.cashbookEntries, entryId, installmentId, (i) => ({
      ...i,
      payments: (i.payments ?? []).map((p) => (p.id === paymentId ? next : p)),
    })),
  };
}

export function applyDeletePayment(
  ledger: Ledger,
  entryId: string,
  installmentId: string,
  paymentId: string
): Ledger | null {
  const found = findPayment(ledger, entryId, installmentId, paymentId);
  if (!found) return null;
  return {
    transactions: ledger.transactions.filter(
      (t) => t.id !== found.payment.transactionId && t.cashbookRef?.paymentId !== paymentId
    ),
    cashbookEntries: mapInstallment(ledger.cashbookEntries, entryId, installmentId, (i) => ({
      ...i,
      payments: (i.payments ?? []).filter((p) => p.id !== paymentId),
    })),
  };
}

// Edits from the transaction screen. A linked transaction keeps its type and link (a
// repayment can't become a transfer); amount/date/account flow back into the cashbook.
export function applyUpdateTransaction(
  ledger: Ledger,
  id: string,
  patch: Partial<Omit<Transaction, 'id'>>
): Ledger {
  const tx = ledger.transactions.find((t) => t.id === id);
  if (!tx) return ledger;
  const ref = tx.cashbookRef;
  const safePatch = { ...patch };
  if (ref) {
    delete safePatch.type;
    delete safePatch.toAccountId;
    delete safePatch.cashbookRef;
  }
  const next: Transaction = { ...tx, ...safePatch };
  const transactions = ledger.transactions.map((t) => (t.id === id ? next : t));

  if (ref?.installmentId && ref.paymentId && findPayment(ledger, ref.entryId, ref.installmentId, ref.paymentId)) {
    return {
      transactions,
      cashbookEntries: mapInstallment(ledger.cashbookEntries, ref.entryId, ref.installmentId, (i) => ({
        ...i,
        payments: (i.payments ?? []).map((p) =>
          p.id === ref.paymentId ? { ...p, amount: next.amount, date: next.date, accountId: next.accountId } : p
        ),
      })),
    };
  }
  if (ref && !ref.installmentId) {
    return {
      transactions,
      cashbookEntries: ledger.cashbookEntries.map((e) =>
        e.id === ref.entryId ? { ...e, createdAt: next.date, accountId: next.accountId } : e
      ),
    };
  }
  return { ...ledger, transactions };
}

export type DeleteTransactionResult =
  | { deleted: true; ledger: Ledger }
  | { deleted: false; reason: 'not-found' | 'cashbook-creation' };

// The creation transaction records the loan/lent money itself and can only go away
// together with its entry. A repayment transaction takes its CashbookPayment with it.
export function applyDeleteTransaction(ledger: Ledger, id: string): DeleteTransactionResult {
  const tx = ledger.transactions.find((t) => t.id === id);
  if (!tx) return { deleted: false, reason: 'not-found' };
  const ref = tx.cashbookRef;
  if (ref && !ref.installmentId && ledger.cashbookEntries.some((e) => e.id === ref.entryId)) {
    return { deleted: false, reason: 'cashbook-creation' };
  }
  if (ref?.installmentId && ref.paymentId) {
    const next = applyDeletePayment(ledger, ref.entryId, ref.installmentId, ref.paymentId);
    if (next) return { deleted: true, ledger: next };
  }
  return { deleted: true, ledger: { ...ledger, transactions: ledger.transactions.filter((t) => t.id !== id) } };
}

export function applyUpdateEntry(
  ledger: Ledger,
  id: string,
  patch: Partial<Pick<CashbookEntry, 'contactName' | 'debtorId' | 'note' | 'createdAt'>>
): Ledger {
  const entry = ledger.cashbookEntries.find((e) => e.id === id);
  if (!entry) return ledger;
  const next: CashbookEntry = { ...entry, ...patch };
  const renamed = next.contactName !== entry.contactName;

  const transactions = ledger.transactions.map((t) => {
    if (t.cashbookRef?.entryId !== id) return t;
    const kind = t.cashbookRef.installmentId ? 'payment' : 'creation';
    let updated = t;
    if (kind === 'creation' && next.createdAt !== t.date) updated = { ...updated, date: next.createdAt };
    // Only rewrite notes the app generated itself; a note the user typed is left alone.
    if (renamed && t.note === cashbookAutoNote(entry.type, kind, entry.contactName)) {
      updated = { ...updated, note: cashbookAutoNote(entry.type, kind, next.contactName) };
    }
    return updated;
  });
  return { transactions, cashbookEntries: ledger.cashbookEntries.map((e) => (e.id === id ? next : e)) };
}

export function countEntryTransactions(ledger: Ledger, id: string): number {
  return ledger.transactions.filter((t) => t.cashbookRef?.entryId === id).length;
}

// deleteTransactions=false keeps the money movements as ordinary transactions but drops
// their link, so nothing is left pointing at an entry that no longer exists.
export function applyDeleteEntry(ledger: Ledger, id: string, deleteTransactions: boolean): Ledger {
  const transactions = deleteTransactions
    ? ledger.transactions.filter((t) => t.cashbookRef?.entryId !== id)
    : ledger.transactions.map((t) => {
        if (t.cashbookRef?.entryId !== id) return t;
        const { cashbookRef: _unlinked, ...rest } = t;
        return rest;
      });
  return { transactions, cashbookEntries: ledger.cashbookEntries.filter((e) => e.id !== id) };
}

// Administrative only: transactions are returned untouched (same array), so no money
// moves and no account balance changes.
export function applyCloseEntry(ledger: Ledger, id: string, closedAt: string): Ledger | null {
  const entry = ledger.cashbookEntries.find((e) => e.id === id);
  if (!entry || !canCloseEntry(entry)) return null;
  return {
    transactions: ledger.transactions,
    cashbookEntries: ledger.cashbookEntries.map((e) =>
      e.id === id ? { ...e, closedAt, closedOutstanding: entryRemaining(entry) } : e
    ),
  };
}

export function applyReopenEntry(ledger: Ledger, id: string): Ledger | null {
  const entry = ledger.cashbookEntries.find((e) => e.id === id);
  if (!entry || !isEntryClosed(entry)) return null;
  const { closedAt: _closedAt, closedOutstanding: _closedOutstanding, ...rest } = entry;
  return {
    transactions: ledger.transactions,
    cashbookEntries: ledger.cashbookEntries.map((e) => (e.id === id ? rest : e)),
  };
}

// Backfill for data saved before payments were tracked (store migration and backup
// restore). Links only via the explicit cashbookRef ids the app already wrote - never by
// amount/date matching. paidAmount is preserved exactly: whatever the linked transactions
// don't explain is kept as untrackedPaidAmount. Idempotent; runs on raw JSON.
export function linkCashbookPayments(state: any, newId: IdFactory): any {
  const entries: any[] | null = Array.isArray(state?.cashbookEntries) ? state.cashbookEntries : null;
  const transactions: any[] | null = Array.isArray(state?.transactions) ? state.transactions : null;
  if (!entries || !transactions) return state;

  const key = (entryId: string, installmentId: string) => `${entryId}::${installmentId}`;
  const knownInstallments = new Set<string>();
  const linkedTxIds = new Set<string>();
  for (const e of entries) {
    for (const i of Array.isArray(e?.installments) ? e.installments : []) {
      knownInstallments.add(key(e.id, i.id));
      for (const p of Array.isArray(i?.payments) ? i.payments : []) linkedTxIds.add(p.transactionId);
    }
  }

  const newPayments = new Map<string, CashbookPayment[]>();
  const nextTransactions = transactions.map((tx) => {
    const ref = tx?.cashbookRef;
    if (!ref?.installmentId || ref.paymentId || linkedTxIds.has(tx.id)) return tx;
    const k = key(ref.entryId, ref.installmentId);
    if (!knownInstallments.has(k)) return tx; // its entry/installment is gone - can't be linked reliably
    if (typeof tx.amount !== 'number' || !Number.isFinite(tx.amount) || tx.amount <= 0) return tx;
    const payment: CashbookPayment = {
      id: newId(),
      amount: tx.amount,
      date: tx.date,
      accountId: tx.accountId,
      transactionId: tx.id,
    };
    if (!newPayments.has(k)) newPayments.set(k, []);
    newPayments.get(k)!.push(payment);
    return { ...tx, cashbookRef: { ...ref, paymentId: payment.id } };
  });
  if (newPayments.size === 0) return state;

  const nextEntries = entries.map((e) => {
    if (!Array.isArray(e?.installments) || !e.installments.some((i: any) => newPayments.has(key(e.id, i.id)))) return e;
    return {
      ...e,
      installments: e.installments.map((i: any) => {
        const added = newPayments.get(key(e.id, i.id));
        if (!added) return i;
        const payments = [...(Array.isArray(i.payments) ? i.payments : []), ...added];
        const tracked = payments.reduce((s: number, p: CashbookPayment) => s + p.amount, 0);
        const untracked = round2((Number(i.paidAmount) || 0) - tracked);
        const { untrackedPaidAmount: _old, ...rest } = i;
        return untracked !== 0 ? { ...rest, payments, untrackedPaidAmount: untracked } : { ...rest, payments };
      }),
    };
  });

  return { ...state, transactions: nextTransactions, cashbookEntries: nextEntries };
}
