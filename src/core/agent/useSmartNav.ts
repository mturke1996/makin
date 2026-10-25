import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ============================================================================
 *  useSmartNav — context-aware navigation intelligence
 * ============================================================================
 *  Inspired by "agent behavior" principles: observe user movement and surface
 *  shortcuts. Tracks the last 5 visited routes and exposes a ranked list of
 *  frequent destinations so nav surfaces can highlight them.
 *
 *  Persisted to localStorage to survive reloads.
 * ============================================================================
 */

const KEY = 'smart-nav-history';
const MAX_HISTORY = 24;

interface VisitEntry {
  path: string;
  ts: number;
  count: number;
}

function load(): VisitEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function save(entries: VisitEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX_HISTORY)));
  } catch {}
}

export function useSmartNav() {
  const location = useLocation();
  const [history, setHistory] = useState<VisitEntry[]>(() => load());
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    const path = location.pathname;
    if (path === lastPathRef.current) return;
    lastPathRef.current = path;

    setHistory((prev) => {
      const existing = prev.find((e) => e.path === path);
      const next: VisitEntry[] = existing
        ? prev.map((e) => (e.path === path ? { ...e, ts: Date.now(), count: e.count + 1 } : e))
        : [...prev, { path, ts: Date.now(), count: 1 }];
      save(next);
      return next;
    });
  }, [location.pathname]);

  /** Top-N most-visited routes, excluding the current one. */
  const frequent = [...history]
    .filter((e) => e.path !== location.pathname)
    .sort((a, b) => b.count - a.count || b.ts - a.ts)
    .slice(0, 4);

  /** Immediately-preceding route (for "back" hints). */
  const previous = [...history]
    .filter((e) => e.path !== location.pathname)
    .sort((a, b) => b.ts - a.ts)[0]?.path;

  return { history, frequent, previous };
}
