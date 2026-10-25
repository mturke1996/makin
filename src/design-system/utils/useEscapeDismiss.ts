import { useEffect, useRef } from 'react';

/**
 * Escape closes the topmost overlay only. Every open Sheet / Modal registers here in open
 * order; one document listener hands the key to the last one, so a dialog over a form over a
 * sheet closes one layer per press instead of all three at once.
 */
const stack: string[] = [];
const handlers = new Map<string, () => void>();
let bound = false;
let nextId = 0;

/** The token that should receive Escape, or undefined when no overlay is open. */
export function topOverlay(order: readonly string[]): string | undefined {
  return order[order.length - 1];
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return;
  const top = topOverlay(stack);
  if (top) handlers.get(top)?.();
}

function bind() {
  if (bound || typeof document === 'undefined') return;
  bound = true;
  document.addEventListener('keydown', onKeyDown);
}

export function useEscapeDismiss(open: boolean, onClose: () => void, enabled = true) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open || !enabled) return;
    bind();
    const token = `esc-${nextId++}`;
    stack.push(token);
    handlers.set(token, () => closeRef.current());
    return () => {
      const i = stack.indexOf(token);
      if (i >= 0) stack.splice(i, 1);
      handlers.delete(token);
    };
  }, [open, enabled]);
}
