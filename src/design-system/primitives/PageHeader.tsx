import { ReactNode } from 'react';
import { cn } from './cn';

interface PageHeaderProps {
  title: ReactNode;
  /** One short line: what this screen is for / what changed. */
  subtitle?: ReactNode;
  /** Primary action(s), at the inline end. */
  actions?: ReactNode;
  /** Small leading element (avatar, icon). */
  leading?: ReactNode;
  /** Breadcrumb / eyebrow line above the title. */
  eyebrow?: ReactNode;
  className?: string;
}

/**
 * Page title block. Plain typography on the canvas (no hero box):
 * 28px title, one muted line, actions aligned to the inline end.
 */
export function PageHeader({ title, subtitle, actions, leading, eyebrow, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-wrap items-center gap-x-4 gap-y-3 pb-1 pt-2', className)}>
      {leading && <div className="flex-none">{leading}</div>}
      <div className="min-w-0 flex-1 basis-48">
        {eyebrow && <div className="mb-1 text-xs font-medium text-fg-muted">{eyebrow}</div>}
        <h1 className="break-words text-xl font-semibold leading-snug text-fg sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-fg-subtle">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-none items-center gap-2">{actions}</div>}
    </header>
  );
}
