import { useEffect, useRef } from 'react';

/**
 * Android/browser Back closes the topmost overlay instead of leaving the page.
 *
 * While an overlay is open we push ONE marker history entry (a copy of the router's
 * state plus `__overlay: token`). Back pops the marker → we close the overlay.
 * Closing in any other way pops the marker ourselves, so history never accumulates.
 *
 * Safe with React Router (the marker keeps `idx` consistent), nested overlays (LIFO),
 * React StrictMode (the push is deferred and cancelled by the dev double-mount) and
 * navigation from inside an overlay (stale markers are skipped on the next Back).
 */
type HistoryState = { __overlay?: string; idx?: number } & Record<string, unknown>;

/** Open overlay tokens in push order (insertion-ordered Set = the overlay stack, bottom → top). */
const live = new Set<string>();
let globalBound = false;
/** Number of upcoming popstate events caused by our own `history.back()` calls. */
let selfPops = 0;

/**
 * Was this overlay's marker popped? `currentMarker` is the marker now on top of the history
 * stack (undefined when we landed on a plain route entry). An overlay is popped when its marker
 * sits ABOVE the current one in the stack: with A, B, C open and C's marker popped, only C is
 * above the current marker (B's), so only C closes.
 */
export function isOverlayPopped(order: readonly string[], token: string, currentMarker: string | undefined): boolean {
  const mine = order.indexOf(token);
  const here = currentMarker ? order.indexOf(currentMarker) : -1;
  return mine > here;
}

function bindGlobal() {
  if (globalBound || typeof window === 'undefined') return;
  globalBound = true;
  window.addEventListener('popstate', () => {
    if (selfPops > 0) {
      selfPops -= 1;
      return;
    }
    const s = window.history.state as HistoryState | null;
    // Landed on a marker nobody owns (its overlay closed while navigating): skip over it.
    if (s?.__overlay && !live.has(s.__overlay)) window.history.back();
  });
}


/**
 * Remove our marker entry after a programmatic close, WITHOUT racing a navigation.
 *
 * `history.back()` is asynchronous. If the app navigates right after closing an overlay
 * (e.g. logout → navigate('/login'), a link inside a sheet), the push would land before the
 * traversal runs and the traversal would then pop the wrong entry (blank screen). So the pop is
 * deferred a moment and only happens while our marker is still the current entry. If a
 * navigation already happened, the marker is left below it as a stale entry that the next Back
 * skips (see `bindGlobal`).
 */
function popMarkerWhenIdle(token: string, attempt = 0) {
  window.setTimeout(() => {
    if (typeof window === 'undefined') return; // the page was torn down while this was waiting
    const s = window.history.state as HistoryState | null;
    if (s?.__overlay === token) {
      selfPops += 1;
      window.history.back();
      return;
    }
    // Another overlay's pop (or our own sibling's) is still in flight: the current marker is
    // dead (no longer live) and a traversal is pending, so look again shortly.
    const inFlight = selfPops > 0 && !!s?.__overlay && !live.has(s.__overlay);
    if (inFlight && attempt < 8) popMarkerWhenIdle(token, attempt + 1);
  }, attempt === 0 ? 60 : 40);
}

export function useBackDismiss(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    bindGlobal();
    const token = `ov-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    let pushed = false;
    let consumed = false;

    const onPop = () => {
      if (!pushed || consumed) return;
      const s = window.history.state as HistoryState | null;
      // Our marker is above the current one → it was popped (Back): close this overlay.
      // Overlays underneath keep their markers at or below the current one, so they stay open.
      if (isOverlayPopped([...live], token, s?.__overlay)) {
        consumed = true;
        live.delete(token);
        closeRef.current();
      }
    };

    // Deferred so React StrictMode's mount → unmount → mount does not push twice.
    const timer = window.setTimeout(() => {
      const cur = (window.history.state || {}) as HistoryState;
      window.history.pushState({ ...cur, __overlay: token, idx: (cur.idx ?? 0) + 1 }, '');
      pushed = true;
      live.add(token);
      window.addEventListener('popstate', onPop);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('popstate', onPop);
      live.delete(token);
      if (pushed && !consumed) popMarkerWhenIdle(token);
    };
  }, [open]);
}
