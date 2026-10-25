import { cn } from '../../../design-system/primitives/cn';
import { CURRENCY_SYMBOL, formatAmountDisplay } from '../../../core/utils-formatters';

/** رقم العهدة (EHD-001) معزول الاتجاه كي لا يتبعثر داخل النص العربي. */
export function RefTag({ value, className }: { value?: string; className?: string }) {
  if (!value) return null;
  return (
    <bdi dir="ltr" className={cn('whitespace-nowrap font-semibold tabular-nums', className)}>
      {value}
    </bdi>
  );
}

/** مبلغ داخل جملة عربية: رقم معزول ثم «د.ل». يعرض القيمة المطلقة دائماً. */
export function Money({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('whitespace-nowrap font-semibold tabular-nums', className)}>
      <bdi dir="ltr">{formatAmountDisplay(Math.abs(value))}</bdi> {CURRENCY_SYMBOL}
    </span>
  );
}

/** DD/MM/YYYY بأرقام لاتينية دون الاعتماد على لغة dayjs. */
export function formatFundDate(value?: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/**
 * HH:mm of the moment a movement was recorded, only when that is the day it is dated: a movement entered later for
 * an earlier date would otherwise show a time that belongs to another day.
 */
export function formatFundTime(createdAt?: string, date?: string): string {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  const local = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  if (date && date.slice(0, 10) !== local) return '';
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function expenseCountLabel(n: number): string {
  if (n === 0) return 'بلا مصروفات';
  if (n === 1) return 'مصروف واحد';
  if (n === 2) return 'مصروفان';
  if (n >= 3 && n <= 10) return `${n} مصروفات`;
  return `${n} مصروفاً`;
}

export type BarSegment = {
  key: string;
  /** نسبة العرض من الشريط كله (0 إلى 100). */
  pct: number;
  className?: string;
  /** لتدرّج لون واحد بين أجزاء متجاورة (الأقسام الفئوية). */
  opacity?: number;
};

/**
 * شريط نسب واحد بأجزاء متجاورة، العرض لكل جزء بنسبته من الشريط، والباقي مسار فارغ.
 * يُقرأ من قارئ الشاشة بنص `label` فقط. بلا حركة، ولا يعتمد على اللون وحده (الأرقام بجواره دائماً).
 */
export function StackedBar({
  segments,
  label,
  thin,
  className,
}: {
  segments: BarSegment[];
  label: string;
  thin?: boolean;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn('flex w-full gap-0.5 overflow-hidden rounded-full bg-surface-sunken', thin ? 'h-1.5' : 'h-2.5', className)}
    >
      {segments
        .filter((s) => s.pct > 0)
        .map((s) => (
          <span
            key={s.key}
            className={cn('block h-full min-w-1 rounded-full', s.className)}
            style={{ flex: `0 1 ${Math.min(100, s.pct)}%`, opacity: s.opacity }}
          />
        ))}
    </div>
  );
}

/** تاريخ اليوم بصيغة حقل date (YYYY-MM-DD) بالتوقيت المحلي وأرقام لاتينية. */
export function todayInputValue(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * className للحقل الداخلي في Input/Select: يملأ ارتفاع الحقل (هدف لمس كامل)،
 * ويلغي حلقة التركيز العامة على العنصر الداخلي لأن إطار الحقل يرسم حلقته.
 */
export const fieldInner = 'h-full focus-visible:shadow-none';
