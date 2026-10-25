import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_ITEMS = 80;

export type InAppNotificationType = 'success' | 'info' | 'warning' | 'error';

export interface InAppNotification {
  id: string;
  type: InAppNotificationType;
  title: string;
  body?: string;
  href?: string;
  read: boolean;
  createdAt: number;
  /** In-app toasts / activity vs Web Push (FCM) */
  source?: 'in_app' | 'push';
}

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `n-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

interface NotificationState {
  items: InAppNotification[];
  /** Append (newest first). Deduplicate recent identical title within 2s. */
  push: (n: {
    type: InAppNotificationType;
    title: string;
    body?: string;
    href?: string;
    source?: 'in_app' | 'push';
  }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clear: () => void;
}

/** The last in-app notification, to swallow an identical one fired twice within 2 s (a double-tap, a re-render). */
let lastPushed: { key: string; at: number } | null = null;

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      items: [],

      push: ({ type, title, body, href, source = 'in_app' }) => {
        const now = Date.now();
        // Same title is not enough: several overdue invoices share one title and differ in body/link.
        const key = `${title}\u0000${body ?? ''}\u0000${href ?? ''}`;
        if (source === 'in_app' && lastPushed && lastPushed.key === key && now - lastPushed.at < 2000) {
          return;
        }
        if (source === 'in_app') lastPushed = { key, at: now };

        const id = newId();
        const row: InAppNotification = {
          id,
          type,
          title,
          body,
          href,
          read: false,
          createdAt: now,
          source,
        };
        set((s) => ({
          items: [row, ...s.items].slice(0, MAX_ITEMS),
        }));
      },

      markRead: (id) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, read: true } : i)),
        })),

      markAllRead: () =>
        set((s) => ({
          items: s.items.map((i) => ({ ...i, read: true })),
        })),

      remove: (id) =>
        set((s) => ({
          items: s.items.filter((i) => i.id !== id),
        })),

      clear: () => set({ items: [] }),
    }),
    {
      name: 'in-app-notifications',
      partialize: (s) => ({ items: s.items }),
    }
  )
);

