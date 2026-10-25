// src/design-system/utils/useScrollLock.ts
let lockCount = 0;
let originalOverflow = '';
/** Increment the global scroll‑lock counter. When the first lock is added we store the current overflow value and set overflow to 'hidden'. */
export function incrementLock(): void {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) originalOverflow = document.body.style.overflow;
  lockCount++;
  document.body.style.overflow = 'hidden';
}
/** Decrement the counter. When it reaches zero we restore the previously stored overflow value. */
export function decrementLock(): void {
  if (typeof document === 'undefined') return;
  if (lockCount <= 0) return;
  lockCount--;
  if (lockCount === 0) document.body.style.overflow = originalOverflow;
}
