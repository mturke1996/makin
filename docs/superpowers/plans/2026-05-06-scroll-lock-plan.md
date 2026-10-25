# Scroll‑Lock Centralized Implementation Plan

## Feature Name: Scroll‑Lock Centralization

> **For agentic workers:** REQUIRED SUB‑SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task‑by‑task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a global counter‑based scroll‑lock system and replace all direct `document.body.style.overflow` manipulations with the new API, eliminating permanent scroll‑lock bugs.

**Architecture:** Add a utility module that tracks a reference count and restores the original overflow only when the last overlay releases the lock. Provide a React hook for components to call with their open state.

**Tech Stack:** TypeScript, React, existing design‑system utilities, Jest/React Testing Library for unit tests.

---

### Task 1: Create scroll‑lock utility

**Files:**
- Create: `src/design-system/utils/useScrollLock.ts`

- [ ] **Step 1: Write failing test**
```ts
import { incrementLock, decrementLock } from './useScrollLock';

test('incrementLock adds lock and sets overflow hidden', () => {
  const original = document.body.style.overflow;
  incrementLock();
  expect(document.body.style.overflow).toBe('hidden');
  decrementLock();
  expect(document.body.style.overflow).toBe(original);
});
```

- [ ] **Step 2: Run test to verify it fails** (no implementation yet) – `npm test -- -t "incrementLock adds lock"`

- [ ] **Step 3: Implement minimal utility**
```ts
let lockCount = 0;
let originalOverflow = '';
export function incrementLock(): void {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) originalOverflow = document.body.style.overflow;
  lockCount++;
  document.body.style.overflow = 'hidden';
}
export function decrementLock(): void {
  if (typeof document === 'undefined') return;
  if (lockCount <= 0) return;
  lockCount--;
  if (lockCount === 0) document.body.style.overflow = originalOverflow;
}
```

- [ ] **Step 4: Run test to verify it passes** – `npm test -- -t "incrementLock adds lock"`

- [ ] **Step 5: Commit**
```bash
git add src/design-system/utils/useScrollLock.ts
git commit -m "feat: add global scroll‑lock utility"
```

---

### Task 2: Create React hook wrapper

**Files:**
- Create: `src/ui/hooks/useScrollLockCounter.ts`

- [ ] **Step 1: Write failing test**
```tsx
import { renderHook } from '@testing-library/react-hooks';
import { useScrollLockCounter } from './useScrollLockCounter';

test('hook increments and decrements lock based on open flag', () => {
  const { rerender, unmount } = renderHook(({ open }) => useScrollLockCounter(open), {
    initialProps: { open: false },
  });
  expect(document.body.style.overflow).toBe('');
  rerender({ open: true });
  expect(document.body.style.overflow).toBe('hidden');
  rerender({ open: false });
  expect(document.body.style.overflow).toBe('');
  unmount();
});
```

- [ ] **Step 2: Run test (should fail)** – `npm test -- -t "hook increments and decrements"`

- [ ] **Step 3: Implement hook**
```tsx
import { useEffect } from 'react';
import { incrementLock, decrementLock } from '../../design-system/utils/useScrollLock';

export function useScrollLockCounter(isOpen: boolean): void {
  useEffect(() => {
    if (isOpen) incrementLock();
    else decrementLock();
    return () => {
      if (isOpen) decrementLock();
    };
  }, [isOpen]);
}
```

- [ ] **Step 4: Run test to verify pass** – `npm test -- -t "hook increments and decrements"`

- [ ] **Step 5: Commit**
```bash
git add src/ui/hooks/useScrollLockCounter.ts
git commit -m "feat: add scroll‑lock hook wrapper"
```

---

### Task 3: Update `Modal` component to use the hook

**Files:**
- Modify: `src/design-system/primitives/Modal.tsx`

- [ ] **Step 1: Write failing test** (ensure overflow not set directly)
```tsx
import { render } from '@testing-library/react';
import { Modal } from './Modal';

test('Modal uses scroll‑lock hook', () => {
  const { rerender } = render(<Modal open={false} onClose={() => {}} />);
  expect(document.body.style.overflow).toBe('');
  rerender(<Modal open={true} onClose={() => {}} />);
  expect(document.body.style.overflow).toBe('hidden');
});
```

- [ ] **Step 2: Run test (should fail because overflow is set directly)** – `npm test -- -t "Modal uses scroll-lock hook"`

- [ ] **Step 3: Refactor component** – remove direct overflow lines and add `useScrollLockCounter(open);` at the top of the component body.

- [ ] **Step 4: Run test to verify passing** – `npm test -- -t "Modal uses scroll-lock hook"`

- [ ] **Step 5: Commit**
```bash
git add src/design-system/primitives/Modal.tsx
git commit -m "refactor: Modal uses centralized scroll‑lock"
```

---

### Task 4: Update `Sheet` component similarly

**Files:**
- Modify: `src/design-system/primitives/Sheet.tsx`

- Follow the same pattern as Task 3: write failing test, replace direct overflow code with the hook, run test, commit.

---

### Task 5: Refactor legacy MUI Dialog usages

**Files:**
- Modify each file that imports `@mui/material` Dialog (e.g., `src/ui/pages-legacy/FundPage.tsx`, `ClientsPage.tsx`, etc.)

- For each component:
  1. Import `useScrollLockCounter`.
  2. Call the hook with the dialog’s `open` prop.
  3. Remove any existing `useEffect` that sets `document.body.style.overflow`.
  4. (Optional) Add a simple test ensuring the hook works.
  5. Commit changes per file.

---

### Task 6: Replace any remaining overflow manipulations (e.g., MobileDrawer)

**Files:**
- Refactor `src/ui/nav/MobileDrawer.tsx` (identified by earlier search) to use the hook instead of manual save/restore.
- Write a test similar to previous ones, run, commit.

---

### Task 7: Add unit tests for utility edge cases

**Files:**
- Create: `src/design-system/utils/__tests__/useScrollLock.test.ts`

- Tests:
  - Nested locks (increment twice, decrement once, ensure overflow stays hidden, final decrement restores).
  - Ensure original overflow value is restored (e.g., set `document.body.style.overflow = 'auto'` before first lock).
  - Guard against negative counter.
- Commit after tests pass.

---

### Task 8: Run full test suite & verify no regressions

- Command: `npm test`
- Ensure all existing tests pass and new ones succeed.
- Fix any failures.
- Commit final state.

---

### Task 9: Documentation updates

- Update `README.md` or design‑system docs section "Overlay scroll handling" with usage examples of `useScrollLockCounter`.
- Commit docs changes.

---

### Task 10: Clean up and push

- Ensure `git status` is clean.
- Push to remote branch (e.g., `feature/scroll-lock-refactor`).
- Open PR for review.

---

**Final checklist** (ensure every box is checked before marking the plan complete):
- [ ] Utility created
- [ ] Hook created
- [ ] Modal updated
- [ ] Sheet updated
- [ ] Legacy Dialogs updated
- [ ] MobileDrawer refactored
- [ ] Unit tests added for utility and edge cases
- [ ] Full test suite passes
- [ ] Documentation updated
- [ ] Changes committed and pushed

---

*Plan saved to `docs/superpowers/plans/2026-05-06-scroll-lock-plan.md`. Two execution options:*\n\n*1. **Subagent‑Driven** (recommended) – dispatch a fresh subagent per task, review between tasks.*\n*2. **Inline Execution** – run tasks sequentially in this session.*\n\n*Which approach would you like to use?*
