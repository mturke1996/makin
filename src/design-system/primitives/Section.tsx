import { ReactNode } from 'react';
import { cn } from './cn';

interface SectionProps {
  title?: ReactNode;
  /** One short line under the title. */
  description?: ReactNode;
  /** Right/end side: a text button or count. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Titled block of content — typography and space do the grouping, not a box. */
export function Section({ title, description, action, children, className }: SectionProps) {
  return (
    <section className={cn('space-y-3', className)}>
      {(title || action) && (
        <header className="flex items-end justify-between gap-3 px-1">
          <div className="min-w-0">
            {title && <h2 className="text-lg font-bold leading-tight text-fg">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-fg-muted">{description}</p>}
          </div>
          {action && <div className="flex-none">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
