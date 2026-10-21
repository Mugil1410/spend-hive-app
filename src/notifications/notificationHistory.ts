import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { appStorage } from '@/store/storage';
import { generateId } from '@/utils/id';

export type NotificationCategory = 'loan' | 'lent' | 'daily' | 'test' | 'system';

export interface NotificationTarget {
  /** A RootStackParamList route, or a tab name (Records, Analysis, …). */
  route: string;
  params?: Record<string, unknown>;
}

export interface AppNotification {
  id: string;
  /** De-duplicates the same delivery seen through several paths (event, tray sync, tap). */
  key: string;
  title: string;
  body: string;
  category: NotificationCategory;
  target?: NotificationTarget;
  createdAt: number;
  read: boolean;
}

const MAX_RECORDS = 300;

interface HistoryState {
  items: AppNotification[];
  hydrated: boolean;
  add: (n: Omit<AppNotification, 'id' | 'read'> & { read?: boolean }) => AppNotification;
  markRead: (id: string) => void;
  markReadByKey: (key: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clearAll: () => void;
}

/** Persistent history of every notification Spend Hive showed (newest first). */
export const useNotificationHistory = create<HistoryState>()(
  persist(
    (set, get) => ({
      items: [],
      hydrated: false,
      add: (n) => {
        const existing = get().items.find((i) => i.key === n.key);
        if (existing) {
          if (n.read && !existing.read) get().markRead(existing.id);
          return existing;
        }
        const item: AppNotification = { ...n, id: generateId(), read: n.read ?? false };
        set((s) => ({
          items: [item, ...s.items].sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_RECORDS),
        }));
        return item;
      },
      markRead: (id) => set((s) => ({ items: s.items.map((i) => (i.id === id && !i.read ? { ...i, read: true } : i)) })),
      markReadByKey: (key) =>
        set((s) => ({ items: s.items.map((i) => (i.key === key && !i.read ? { ...i, read: true } : i)) })),
      markAllRead: () => set((s) => ({ items: s.items.map((i) => (i.read ? i : { ...i, read: true })) })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clearAll: () => set({ items: [] }),
    }),
    {
      name: 'spendhive-notification-history',
      storage: createJSONStorage(() => appStorage),
      version: 1,
      partialize: (s) => ({ items: s.items }),
      onRehydrateStorage: () => () => {
        useNotificationHistory.setState({ hydrated: true });
      },
    }
  )
);

/** Resolves once history is loaded, so background handlers don't write over unloaded data. */
export function whenHistoryHydrated(): Promise<void> {
  if (useNotificationHistory.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = useNotificationHistory.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}

export function useUnreadCount(): number {
  return useNotificationHistory((s) => s.items.reduce((n, i) => (i.read ? n : n + 1), 0));
}
