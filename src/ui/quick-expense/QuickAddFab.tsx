import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Add } from '../../design-system/icons';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAccess } from '../../core/access/useAccess';
import { cn } from '../../design-system/primitives/cn';

const loadSheet = () => import('./QuickExpenseSheet');
const QuickExpenseSheet = lazy(loadSheet);

/** Whether the person may record expenses at all: the button exists only then. */
export function useCanQuickAdd(): boolean {
  const access = useAccess();
  const userId = useAuthStore((s) => s.user?.id);
  return !!userId && access.can('expenses.create');
}

/**
 * The "+" on Home: records an expense in a few taps. A round 56px button above the bottom
 * navigation on phones, a labelled "+ مصروف" button on desktop, always at the inline end (left in RTL).
 * It sits under every sheet and menu (z-index below the navigation and the overlays).
 */
export function QuickAddFab({ className, initialClientId, initialPhaseId }: { className?: string; initialClientId?: string; initialPhaseId?: string }) {
  const allowed = useCanQuickAdd();
  const [open, setOpen] = useState(false);
  /** A new sheet is mounted for each opening, so it always starts empty. */
  const [session, setSession] = useState(0);

  // The sheet is a separate chunk: fetch it while the browser is idle so the first tap is instant.
  useEffect(() => {
    if (!allowed) return;
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1200));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(() => void loadSheet());
    return () => cancel(handle as number);
  }, [allowed]);

  const openSheet = useCallback(() => {
    setSession((n) => n + 1);
    setOpen(true);
  }, []);

  if (!allowed) return null;

  return (
    <>
      <button
        type="button"
        aria-label="تسجيل مصروف سريع"
        aria-haspopup="dialog"
        onClick={openSheet}
        className={cn(
          'fixed end-4 z-[900] inline-flex size-14 select-none items-center justify-center gap-2 rounded-full',
          'bg-accent text-accent-on shadow-lg hover:bg-accent-hover',
          'bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:bottom-8 lg:end-8 lg:h-14 lg:w-auto lg:px-6',
          'transition-[transform,background-color] duration-[120ms] ease-out active:scale-95',
          'focus:outline-none focus-visible:shadow-focus',
          className,
        )}
      >
        <Add aria-hidden sx={{ fontSize: 28 }} />
        <span className="hidden text-base font-semibold lg:inline">مصروف</span>
      </button>
      {session > 0 && (
        <Suspense fallback={null}>
          <QuickExpenseSheet key={session} open={open} onClose={() => setOpen(false)} initialClientId={initialClientId} initialPhaseId={initialPhaseId} />
        </Suspense>
      )}
    </>
  );
}
