import { ReactNode, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Close, ArrowBack, ArrowForward } from '../icons';
import { cn } from './cn';
import { IconButton } from './IconButton';
import { useScrollLockCounter } from '../../ui/hooks/useScrollLockCounter';
import { useMountTransition } from '../utils/useMountTransition';
import { useBackDismiss } from '../utils/useBackDismiss';
import { useEscapeDismiss } from '../utils/useEscapeDismiss';
import { useModalFocus } from '../utils/useModalFocus';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Start-side action in the header, e.g. a "+ Add" button. */
  headerAction?: ReactNode;
  /** Below-title row (filters, export bar, key figures). Sits inside the header. */
  headerExtras?: ReactNode;
  /** Pinned bottom action bar (Save / Cancel). */
  footer?: ReactNode;
  children: ReactNode;
  /** Panel max width. Below md (phones) the sheet follows `mobile`. */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  /** `full`: full-screen page-like sheet. `bottom`: rounded bottom sheet with grabber + drag to dismiss. */
  mobile?: 'full' | 'bottom';
  rtl?: boolean;
  /** @deprecated gradients were removed from the design system; ignored. */
  toneGradient?: string;
  /** @deprecated ignored. */
  headerGlow?: boolean;
}

const widths = {
  sm: 'md:max-w-lg',
  md: 'md:max-w-2xl',
  lg: 'md:max-w-4xl',
  xl: 'md:max-w-6xl',
} as const;

/**
 * Sheet — the app's single overlay surface for forms and detail views.
 *  Mobile: full-screen (default) or bottom sheet. Desktop: centered panel.
 *  Header is plain surface (no gradient); the title is the hierarchy.
 */
export function Sheet({
  open, onClose, title, subtitle, headerAction, headerExtras, footer, children,
  maxWidth = 'md', mobile = 'full', rtl,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; lastY: number; lastT: number; v: number } | null>(null);
  const { mounted, state } = useMountTransition(open, 240);

  const isRTL = rtl ?? (typeof document !== 'undefined' && document.documentElement.getAttribute('dir') === 'rtl');
  useScrollLockCounter(open);
  useBackDismiss(open, onClose);
  useEscapeDismiss(open, onClose);
  useModalFocus(open, rootRef, panelRef);

  /* Drag the grabber/header down to dismiss (bottom mode, touch + mouse) */
  const onDragStart = useCallback((e: React.PointerEvent) => {
    if (mobile !== 'bottom' || (e.target as HTMLElement).closest('button, a, input, select, textarea')) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, lastY: e.clientY, lastT: performance.now(), v: 0 };
    if (panelRef.current) panelRef.current.style.transition = 'none';
  }, [mobile]);
  const onDragMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !panelRef.current) return;
    const dy = Math.max(0, e.clientY - d.startY);
    const now = performance.now();
    d.v = (e.clientY - d.lastY) / Math.max(1, now - d.lastT);
    d.lastY = e.clientY;
    d.lastT = now;
    panelRef.current.style.transform = `translateY(${dy}px)`;
  }, []);
  const onDragEnd = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    const el = panelRef.current;
    dragRef.current = null;
    if (!d || !el) return;
    const dy = Math.max(0, e.clientY - d.startY);
    el.style.transition = 'transform 220ms var(--ease-out)';
    if (dy > 120 || d.v > 0.55) {
      el.style.transform = 'translateY(100%)';
      window.setTimeout(onClose, 160);
    } else {
      el.style.transform = '';
      window.setTimeout(() => { if (el) el.style.transition = ''; }, 230);
    }
  }, [onClose]);

  if (!mounted) return null;
  const BackIcon = isRTL ? ArrowForward : ArrowBack;
  const bottom = mobile === 'bottom';

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : 'نافذة'}
      className="fixed inset-0 z-[1200] flex items-end justify-center md:items-center md:p-6"
    >
      <div
        data-state={state}
        onClick={onClose}
        className="sheet-scrim absolute inset-0 bg-surface-scrim data-[state=closed]:pointer-events-none"
        style={{ animation: `${state === 'open' ? 'scrim-in' : 'scrim-out'} ${state === 'open' ? 200 : 180}ms var(--ease-out) both` }}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        data-state={state}
        className={cn(
          'relative flex w-full flex-col overflow-hidden bg-surface-canvas outline-none',
          'md:max-h-[min(90dvh,60rem)] md:rounded-2xl md:shadow-xl md:border md:border-border',
          widths[maxWidth],
          bottom ? 'max-h-[92dvh] rounded-t-3xl shadow-xl' : 'h-[100dvh] md:h-auto'
        )}
        style={{
          animation:
            state === 'open'
              ? `${typeof window !== 'undefined' && window.innerWidth >= 768 ? 'pop-in 200ms' : 'sheet-up 320ms'} var(--ease-ios) both`
              : `${typeof window !== 'undefined' && window.innerWidth >= 768 ? 'pop-out 160ms' : 'sheet-down 220ms'} var(--ease-in) both`,
        }}
      >
        <header
          className={cn('shrink-0 border-b border-border bg-surface-panel', !bottom && 'pwa-safe-top md:pt-0')}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          style={bottom ? { touchAction: 'none' } : undefined}
        >
          {bottom && <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-border-strong md:hidden" />}
          <div className="flex items-center gap-2 px-3 py-2 md:px-5">
            <IconButton label={bottom ? 'إغلاق' : 'رجوع'} onClick={onClose} variant="ghost">
              {bottom ? <Close sx={{ fontSize: 22 }} /> : <BackIcon sx={{ fontSize: 22 }} />}
            </IconButton>
            <div className="min-w-0 flex-1 px-1">
              {title && <h2 className="break-words text-lg font-bold leading-snug text-fg">{title}</h2>}
              {subtitle && <p className="break-words text-xs leading-relaxed text-fg-muted">{subtitle}</p>}
            </div>
            {headerAction && <div className="shrink-0">{headerAction}</div>}
          </div>
          {headerExtras && <div className="px-4 pb-3 md:px-5">{headerExtras}</div>}
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>

        {footer && (
          <div className={cn('shrink-0 border-t border-border bg-surface-panel px-4 py-3 md:px-6', 'pb-[max(12px,env(safe-area-inset-bottom))]')}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/** A neutral close icon button for custom headers. */
export function SheetCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <IconButton size="md" label="إغلاق" onClick={onClick} variant="ghost">
      <Close sx={{ fontSize: 22 }} />
    </IconButton>
  );
}
