import { ReactNode, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from './cn';
import { useScrollLockCounter } from '../../ui/hooks/useScrollLockCounter';
import { useMountTransition } from '../utils/useMountTransition';
import { useBackDismiss } from '../utils/useBackDismiss';
import { useEscapeDismiss } from '../utils/useEscapeDismiss';
import { useModalFocus } from '../utils/useModalFocus';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
  /** Set false to disable backdrop click-to-close. */
  dismissible?: boolean;
}

const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-2xl' } as const;

/**
 * Modal — focused dialog. Bottom-anchored on phones (thumb reach), centered from sm up.
 * Prefer inline/progressive UI first; use this for confirmations and short forms.
 */
export function Modal({ open, onClose, title, description, children, maxWidth = 'md', dismissible = true }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const { mounted, state } = useMountTransition(open, 200);
  useScrollLockCounter(open);
  useBackDismiss(open, dismissible ? onClose : () => {});
  useEscapeDismiss(open, onClose, dismissible);
  useModalFocus(open, rootRef, panelRef);

  if (!mounted) return null;
  const wide = typeof window !== 'undefined' && window.innerWidth >= 640;

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : 'نافذة'}
      className="fixed inset-0 z-[1200] flex items-end justify-center sm:items-center sm:p-4"
    >
      <div
        onClick={dismissible ? onClose : undefined}
        className="absolute inset-0 bg-surface-scrim"
        style={{ animation: `${state === 'open' ? 'scrim-in' : 'scrim-out'} 180ms var(--ease-out) both` }}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-surface-panel outline-none',
          'rounded-t-3xl border border-border shadow-xl sm:rounded-2xl',
          widths[maxWidth]
        )}
        style={{
          animation: `${state === 'open' ? (wide ? 'pop-in 200ms' : 'sheet-up 300ms') : wide ? 'pop-out 160ms' : 'sheet-down 200ms'} ${
            state === 'open' ? 'var(--ease-ios)' : 'var(--ease-in)'
          } both`,
        }}
      >
        {(title || description) && (
          <header className="shrink-0 border-b border-border px-5 py-4">
            {title && <h2 className="text-lg font-bold leading-snug text-fg">{title}</h2>}
            {description && <p className="mt-1 text-sm text-fg-subtle">{description}</p>}
          </header>
        )}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 pb-[max(20px,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>,
    document.body
  );
}
