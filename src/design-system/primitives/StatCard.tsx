import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { cn } from './cn';

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  badge?: ReactNode;
  trend?: ReactNode;
  onClick?: () => void;
  className?: string;
  valueClassName?: string;
  definition?: boolean;
}

/** Port of linda-shop-main's StatCard: the same geometry, type and reading order. */
export function StatCard({ label, value, hint, badge, trend, onClick, className, valueClassName, definition }: StatCardProps) {
  const valueRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = valueRef.current;
    if (!element) return;
    let alive = true;
    const fit = () => {
      if (!alive || element.clientWidth === 0) return;
      const rootSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const maximum = rootSize * 1.5;
      const minimum = rootSize * 0.875;
      element.dataset.wrapNumber = 'false';
      element.style.fontSize = `${maximum}px`;
      const digits = [...element.querySelectorAll<HTMLElement>('bdi')];
      const width = Math.max(element.scrollWidth, ...digits.map((digit) => digit.getBoundingClientRect().width));
      element.style.fontSize = `${width > element.clientWidth ? Math.max(minimum, Math.floor(maximum * element.clientWidth / width)) : maximum}px`;
      element.dataset.wrapNumber = String(digits.some((digit) => digit.getBoundingClientRect().width > element.clientWidth));
    };
    fit();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(fit);
    observer?.observe(element);
    void document.fonts?.ready.then(fit);
    return () => { alive = false; observer?.disconnect(); };
  }, [value]);
  const Heading = definition ? 'dt' : 'div';
  const Body = definition ? 'dd' : 'div';
  const content = <>
    <Heading className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
      <span className="min-w-0 text-2xs font-medium text-fg-subtle">{label}</span>
      {badge}
    </Heading>
    <Body className="min-w-0 space-y-0.5">
      <div ref={valueRef} className={cn(
        'stat-card-value text-2xl font-semibold leading-8 tabular-nums text-fg',
        '[&>span]:whitespace-normal [&_bdi]:whitespace-nowrap',
        '[&>span:has(bdi)]:[font-size:inherit] [&>span:has(bdi)]:font-semibold',
        'data-[wrap-number=true]:[&_bdi]:whitespace-normal data-[wrap-number=true]:[&_bdi]:[overflow-wrap:anywhere]',
        '[&_[data-currency]]:text-[0.85em] [&_[data-currency]]:font-normal [&_[data-currency]]:text-fg-subtle [&_[data-currency]]:opacity-100',
        valueClassName,
      )}>{value}</div>
      {hint && <p className="text-3xs text-fg-muted">{hint}</p>}
    </Body>
    {trend && <div className="mt-auto [&>div]:!h-10 [&>svg]:!h-10">{trend}</div>}
  </>;
  const classes = cn(
    'flex min-h-[6.5rem] min-w-0 flex-col gap-2 rounded-lg border border-border bg-surface-panel p-3.5',
    onClick && 'w-full text-start transition-colors duration-fast hover:border-border-strong hover:bg-surface-sunken focus:outline-none focus-visible:shadow-focus',
    className,
  );
  return onClick ? <button type="button" onClick={onClick} className={classes}>{content}</button> : <div className={classes}>{content}</div>;
}
