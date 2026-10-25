import { useId, type ReactNode } from 'react';
import { ArrowBack, ErrorOutline, InfoOutlined, TaskAlt, WarningAmber } from '@mui/icons-material';
import { Card, CardDescription, CardHeader, CardTitle } from './Card';
import { cn } from './cn';

export type AttentionSeverity = 'danger' | 'warning' | 'info';
export const ATTENTION_META = {
  danger: { label: 'عاجل', ink: 'text-danger-ink', wash: 'bg-danger-soft', Icon: ErrorOutline },
  warning: { label: 'تنبيه', ink: 'text-warning-ink', wash: 'bg-warning-soft', Icon: WarningAmber },
  info: { label: 'ملاحظة', ink: 'text-info-ink', wash: 'bg-info-soft', Icon: InfoOutlined },
} as const;

export function AttentionPanel({ title, counts, empty, children, footer, className }: {
  title: string;
  counts: Record<AttentionSeverity, number>;
  empty?: boolean;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const id = useId();
  return <Card padding="none" className={className} role="region" aria-labelledby={id}>
    <CardHeader className="flex-wrap gap-y-2">
      <div className="min-w-0">
        <CardTitle id={id}>{title}</CardTitle>
        <CardDescription className="mt-1">{empty ? 'الحساب لا يحتاج متابعة الآن' : 'الأولوية أولًا، ثم تفاصيل كل بند وإجراءه'}</CardDescription>
      </div>
      {!empty && <div className="flex flex-wrap gap-1.5" aria-label="ملخص الأولويات">{(Object.keys(ATTENTION_META) as AttentionSeverity[]).filter((key) => counts[key] > 0).map((key) => <span key={key} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-3xs font-medium', ATTENTION_META[key].wash, ATTENTION_META[key].ink)}><bdi>{counts[key]}</bdi>{ATTENTION_META[key].label}</span>)}</div>}
    </CardHeader>
    {empty ? <div className="flex items-center gap-2 border-t border-border px-4 py-4 text-sm text-fg-subtle"><TaskAlt className="shrink-0 text-success-ink" sx={{ fontSize: 20 }} aria-hidden />لا توجد ملاحظات تستدعي إجراءً حاليًا.</div> : <ul className="divide-y divide-border border-t border-border">{children}</ul>}
    {footer && <div className="border-t border-border px-4 py-1">{footer}</div>}
  </Card>;
}

export function AttentionRow({ title, reason, severity, actionLabel, onAction, amount }: {
  title: string;
  reason: ReactNode;
  severity: AttentionSeverity;
  actionLabel: string;
  onAction?: () => void;
  amount?: ReactNode;
}) {
  const meta = ATTENTION_META[severity];
  const { Icon } = meta;
  const content = <>
    <div className="flex items-start gap-2.5">
      <Icon sx={{ fontSize: 20 }} className={cn('mt-0.5 shrink-0', meta.ink)} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2"><span className={cn('text-3xs font-semibold', meta.ink)}>{meta.label}</span></div>
        <p className="break-words text-sm font-semibold leading-relaxed text-fg">{title}</p>
        <p className="mt-1 break-words text-xs leading-relaxed text-fg-subtle [overflow-wrap:anywhere]">{reason}</p>
      </div>
    </div>
    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 ps-[30px]">
      {amount && <div className="min-w-0 text-md font-semibold [&_bdi]:whitespace-normal [&_bdi]:[overflow-wrap:anywhere]">{amount}</div>}
      {onAction && <span className="ms-auto inline-flex min-h-6 items-center gap-1.5 text-2xs font-medium text-accent-ink">{actionLabel}<ArrowBack sx={{ fontSize: 15 }} className="ltr:rotate-180" aria-hidden /></span>}
    </div>
  </>;
  const classes = 'block w-full min-w-0 px-4 py-3.5 text-start';
  return <li className="min-w-0">{onAction ? <button type="button" onClick={onAction} className={cn(classes, 'transition-colors hover:bg-surface-sunken focus:outline-none focus-visible:shadow-[inset_var(--brand-focus-ring)]')}>{content}</button> : <div className={classes}>{content}</div>}</li>;
}
