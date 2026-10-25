import { ComponentType, ReactNode } from 'react';
import { cn } from './cn';

interface EmptyStateProps {
  Icon?: ComponentType<{ sx?: object; className?: string }>;
  title: ReactNode;
  /** Teach the screen: what goes here and how to add the first item. */
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** `inline` removes the surrounding dashed frame (for use inside a panel). */
  bare?: boolean;
}

export function EmptyState({ Icon, title, description, action, className, bare }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center px-6 py-10 text-center',
        !bare && 'rounded-lg border border-dashed border-border-strong bg-surface-panel',
        className
      )}
    >
      {Icon && (
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-sunken text-fg-muted">
          <Icon sx={{ fontSize: 26 }} />
        </span>
      )}
      <p className="text-base font-semibold text-fg">{title}</p>
      {description && <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-fg-subtle">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
