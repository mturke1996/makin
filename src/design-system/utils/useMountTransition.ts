import { useEffect, useState } from 'react';

/**
 * Keeps a component mounted long enough to play its exit animation.
 * `mounted` → render; `state` → "open" | "closed" for data-state CSS hooks.
 */
export function useMountTransition(open: boolean, exitMs = 220) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = window.setTimeout(() => setMounted(false), reduced ? 0 : exitMs);
    return () => window.clearTimeout(t);
  }, [open, exitMs]);
  return { mounted: open || mounted, state: open ? ('open' as const) : ('closed' as const) };
}
