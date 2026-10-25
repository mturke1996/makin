// src/ui/hooks/useScrollLockCounter.ts
import { useEffect } from 'react';
import { incrementLock, decrementLock } from '../../design-system/utils/useScrollLock';

/**
 * Global scroll‑lock hook. Increments the lock counter when `isOpen` is true and
 * decrements it when false or on unmount. Guarantees that `overflow: hidden`
 * stays applied until the last overlay releases the lock.
 */
export function useScrollLockCounter(isOpen: boolean): void {
  useEffect(() => {
    // Only an open overlay holds a lock; its cleanup releases exactly that one lock.
    // (Decrementing on a closed/just-mounted overlay would release a lock held by a
    // parent Sheet and let the page scroll behind it.)
    if (!isOpen) return;
    incrementLock();
    return () => {
      decrementLock();
    };
  }, [isOpen]);
}
