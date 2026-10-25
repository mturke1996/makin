/**
 * What the quick expense sheet remembers per person on this device: the last client and category.
 * Browser storage can be missing, full or blocked (private windows), so every access is guarded and
 * the sheet works the same without it.
 */

export interface QuickPrefs {
  clientId?: string;
  category?: string;
  favorites?: string[];
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const keyFor = (userId: string, projectId: string) => `quick-expense:prefs:v2:${encodeURIComponent(projectId)}:${encodeURIComponent(userId)}`;

function defaultStorage(): StorageLike | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}

export function readQuickPrefs(userId: string | undefined, storage: StorageLike | undefined = defaultStorage(), projectId = 'default'): QuickPrefs {
  if (!userId || !projectId || !storage) return {};
  try {
    const raw = storage.getItem(keyFor(userId, projectId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      ...(typeof parsed.clientId === 'string' && parsed.clientId ? { clientId: parsed.clientId } : {}),
      ...(typeof parsed.category === 'string' && parsed.category ? { category: parsed.category } : {}),
      ...(Array.isArray(parsed.favorites) ? { favorites: [...new Set(parsed.favorites.filter((value): value is string => typeof value === 'string'))].slice(0, 12) } : {}),
    };
  } catch {
    return {};
  }
}

export function writeQuickPrefs(
  userId: string | undefined,
  prefs: QuickPrefs,
  storage: StorageLike | undefined = defaultStorage(),
  projectId = 'default',
): void {
  if (!userId || !storage) return;
  try {
    storage.setItem(keyFor(userId, projectId), JSON.stringify(prefs));
  } catch {
    /* storage unavailable: the choice is simply not remembered */
  }
}
