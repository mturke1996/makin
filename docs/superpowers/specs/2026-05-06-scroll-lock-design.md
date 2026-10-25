# Scroll‑Lock Centralized Design

## Problem
When a modal, sheet, drawer, or any overlay sets `document.body.style.overflow = 'hidden'` directly, nested or overlapping overlays can leave the page permanently scroll‑locked because the cleanup runs only for the component that set it. This occurs in the existing `Modal`, `Sheet`, and several legacy MUI `Dialog`s.

## Goal
Create a **global, counter‑based scroll‑lock** that works for any number of simultaneously‑open overlays and restores the original overflow state only when the last overlay closes.

## Solution Overview
1. **Utility module** `src/design-system/utils/useScrollLock.ts` exposing:
   - `incrementLock(): void`
   - `decrementLock(): void`
   - Internally tracks a reference count and the original overflow value (stack‑able for nested locks).
2. **React hook** `src/ui/hooks/useScrollLockCounter.ts` that components call as `useScrollLockCounter(isOpen)`.
3. Replace direct overflow manipulation in:
   - `Modal.tsx`
   - `Sheet.tsx`
   - All legacy MUI `Dialog` usages (e.g., `FundPage.tsx`, `ClientsPage.tsx`).
4. For non‑React overlays (drawers, custom fullscreen panels), call `incrementLock()` on open and `decrementLock()` on close.
5. Ensure SSR safety by guarding `document` access.

## API Details
```ts
// src/design-system/utils/useScrollLock.ts
export function incrementLock(): void;
export function decrementLock(): void;
```
```ts
// src/ui/hooks/useScrollLockCounter.ts
export function useScrollLockCounter(isOpen: boolean): void;
```

## Integration Steps
1. Add the two new files.
2. Update `Modal.tsx` and `Sheet.tsx` to import and use `useScrollLockCounter(open)`.
3. Refactor each legacy MUI `Dialog` component to use the same hook (remove its own overflow code).
4. Search the repository for any remaining `document.body.style.overflow` assignments and replace them with the new API.
5. Add unit tests for the counter utility (increment/decrement, nested behavior, restoration of original overflow).
6. Verify manually that opening multiple overlays locks scrolling only once and unlocking after the last overlay restores scrolling.

## Edge‑Case Handling
- Component unmounts while still open → cleanup in hook calls `decrementLock()`.
- Rapid open/close → counter updates are synchronous, avoiding race conditions.
- Pre‑existing custom overflow → the utility stores the first overflow value and restores it exactly when count reaches zero.
- Server‑side rendering → guard `typeof document !== 'undefined'`.

## Testing Strategy
- **Unit tests** for `useScrollLock.ts` covering:
  - Single lock
  - Nested locks (2‑3 levels)
  - Correct restoration of original overflow value.
- **Integration tests** using React Testing Library to mount a component with the hook, open/close modals, and assert `document.body.style.overflow`.
- **Manual QA**: open a modal, then a drawer, then close them in various orders; ensure scrolling behaves correctly.

## Documentation
- Add JSDoc comments to the new utility functions.
- Update README section "Overlay scroll handling" with usage examples.

---

*Spec written and ready for implementation.*
