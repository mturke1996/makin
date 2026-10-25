import type { ReactNode } from 'react';
import { cn } from './cn';

function Track({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative h-6 w-11 flex-none rounded-full transition-colors duration-base ease-out',
        checked ? 'bg-accent' : 'bg-border-strong'
      )}
    >
      <span
        className={cn(
          'absolute start-0.5 top-0.5 size-5 rounded-full shadow-xs transition-transform duration-base ease-out',
          checked ? 'translate-x-5 bg-accent-on rtl:-translate-x-5' : 'translate-x-0 bg-surface-panel'
        )}
      />
    </span>
  );
}

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name (required: the control has no visible text of its own). */
  label: string;
  disabled?: boolean;
  className?: string;
}

/** Standalone toggle: a 44x24 track inside a 44px-tall hit area. */
export function Switch({ checked, onChange, label, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'inline-flex h-11 items-center rounded-full px-0 disabled:opacity-50',
        'focus:outline-none focus-visible:shadow-focus',
        className
      )}
    >
      <Track checked={checked} />
    </button>
  );
}

interface SwitchRowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/**
 * A whole list row that is one switch (role=switch): title, optional hint, and the
 * track at the end. Rows sit inside a `ListGroup` so they separate with hairlines.
 */
export function SwitchRow({ title, subtitle, leading, checked, onChange, disabled }: SwitchRowProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex min-h-14 w-full items-center gap-3 px-4 py-3 text-start',
        'transition-colors duration-fast ease-out hover:bg-surface-hover disabled:opacity-50',
        'focus:outline-none focus-visible:shadow-[inset_var(--brand-focus-ring)]'
      )}
    >
      {leading && <span className="flex-none">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium leading-snug text-fg">{title}</span>
        {subtitle && <span className="mt-0.5 block text-xs leading-relaxed text-fg-muted">{subtitle}</span>}
      </span>
      <Track checked={checked} />
    </button>
  );
}
