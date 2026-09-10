import { generateId } from '@/utils/id';

// Zustand `persist` schema versioning for the app's single AsyncStorage-backed store.
//
// Every future schema change must add exactly one new entry keyed by the version it
// upgrades *into* (e.g. version 2 fixes up state that was persisted at version < 2),
// and that entry must only ADD fields/arrays with safe defaults - never rename or
// remove existing keys. Each step should defensively guard array reads with
// `Array.isArray(...)` since `migrate` runs on raw, possibly-partial persisted JSON
// (e.g. from an older app version, or a restored backup).
export const CURRENT_VERSION = 3;

type Migration = (state: any) => any;

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

const migrations: Record<number, Migration> = {
  // 1: no persisted-shape changes yet - this version only introduces the
  // versioning/migration machinery itself so later phases can rely on it safely.
  1: (state) => state,

  // 2: introduces the Debtor entity. Existing CashbookEntry.contactName strings are
  // deduped (trim + lowercase) into Debtor records and each entry gets a debtorId.
  // contactName itself is kept untouched as a display fallback / safety net.
  2: (state) => {
    const cashbookEntries = Array.isArray(state?.cashbookEntries) ? state.cashbookEntries : [];
    const existingDebtors = Array.isArray(state?.debtors) ? state.debtors : [];
    const byKey = new Map<string, any>(existingDebtors.map((d: any) => [d.nameKey, d]));

    const nextEntries = cashbookEntries.map((entry: any) => {
      const rawName = typeof entry?.contactName === 'string' ? entry.contactName : '';
      const key = normalizeName(rawName);
      if (!key) return entry;
      let debtor = byKey.get(key);
      if (!debtor) {
        debtor = {
          id: generateId(),
          name: rawName.trim(),
          nameKey: key,
          createdAt: entry?.createdAt ?? new Date().toISOString(),
        };
        byKey.set(key, debtor);
      }
      return { ...entry, debtorId: entry?.debtorId ?? debtor.id };
    });

    return {
      ...state,
      debtors: Array.from(byKey.values()),
      cashbookEntries: nextEntries,
    };
  },

  // 3: introduces the Events entity. Purely additive - no existing data touched.
  3: (state) => ({
    ...state,
    events: Array.isArray(state?.events) ? state.events : [],
  }),
};

export function runMigrations(persistedState: unknown, fromVersion: number): any {
  let state = persistedState;
  for (let v = fromVersion + 1; v <= CURRENT_VERSION; v++) {
    const migrate = migrations[v];
    if (migrate) state = migrate(state);
  }
  return state;
}
