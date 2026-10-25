import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  interactive?: boolean;
  title?: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  padding?: 'default' | 'none';
}

/**
 * Panel with an optional header block. Use sparingly: spacing and dividers
 * group most content; a card is for distinct, actionable objects.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { interactive, title, description, leading, trailing, padding = 'default', className, children, ...rest },
  ref
) {
  const hasHeader = !!(title || description || leading || trailing);
  return (
    <div
      ref={ref}
      className={cn(
        'min-w-0 rounded-lg border border-border bg-surface-panel',
        interactive && 'cursor-pointer transition-colors hover:border-border-strong hover:bg-surface-sunken',
        className
      )}
      {...rest}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-3 p-4 pb-3">
          {leading && <div className="flex-none">{leading}</div>}
          <div className="min-w-0 flex-1">
            {title && <div className="text-sm font-semibold text-fg">{title}</div>}
            {description && <div className="mt-0.5 text-2xs text-fg-subtle">{description}</div>}
          </div>
          {trailing && <div className="flex-none">{trailing}</div>}
        </div>
      )}
      {children && (padding === 'none' ? children : <div className={cn(hasHeader ? 'px-4 pb-4' : 'p-4')}>{children}</div>)}
    </div>
  );
});

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-start justify-between gap-3 p-4 pb-3', className)} {...props} />;
}
export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-sm font-semibold text-fg', className)} {...props} />;
}
export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-2xs text-fg-subtle', className)} {...props} />;
}
export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 pt-0', className)} {...props} />;
}
export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-2 border-t border-border p-4', className)} {...props} />;
}
