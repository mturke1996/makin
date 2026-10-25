import { useMemo } from 'react';
import { Amount } from '../../../../design-system/primitives';
import { monthRange, summarizeAttendance, wageView, wagesEarned } from '../../../../core/finance/workerAttendance';
import type { WorkerAttendance } from '../../../../types';

interface Props {
  dailyRate?: number;
  records: WorkerAttendance[];
  /** Everything paid to the worker so far (the ledger's paid total). */
  paid: number;
  /** Today, `YYYY-MM-DD` (to know which month is "this month"). */
  today: string;
}

/** The worker's attendance this month and, for a daily-wage worker, what it earned against what he was paid. */
export function WorkerAttendancePanel({ dailyRate, records, paid, today }: Props) {
  const month = useMemo(() => summarizeAttendance(records, monthRange(today)), [records, today]);
  const wages = useMemo(() => wageView(dailyRate, records, paid), [dailyRate, records, paid]);
  if (records.length === 0 && !dailyRate) return null;

  return (
    <section aria-label="الحضور والأجر" className="space-y-3 rounded-lg border border-border bg-surface-panel p-4">
      <h3 className="text-sm font-semibold text-fg">الحضور هذا الشهر</h3>
      <dl className="grid grid-cols-4 gap-3">
        {[
          ['حاضر', month.present],
          ['نصف يوم', month.half],
          ['غائب', month.absent],
          ['أيام العمل', month.units],
        ].map(([label, value]) => (
          <div key={label as string} className="min-w-0">
            <dt className="text-2xs text-fg-muted">{label}</dt>
            <dd className="mt-0.5 text-lg font-bold tabular-nums text-fg">{value}</dd>
          </div>
        ))}
      </dl>
      {wages ? (
        <div className="space-y-1.5 border-t border-border pt-3 text-sm">
          <p className="flex items-center justify-between gap-3">
            <span className="text-fg-subtle">أجر هذا الشهر <span className="text-fg-muted">(<Amount amount={wages.rate} bare /> د.ل لليوم)</span></span>
            <Amount amount={wagesEarned(dailyRate, month.units)} className="font-semibold" />
          </p>
          <p className="flex items-center justify-between gap-3">
            <span className="text-fg-subtle">أجر كل أيام الحضور المسجلة</span>
            <Amount amount={wages.earned} className="font-semibold" />
          </p>
          <p className="flex items-center justify-between gap-3">
            <span className="text-fg-subtle">المدفوع له</span>
            <Amount amount={wages.paid} className="font-semibold" />
          </p>
          <p className="flex items-center justify-between gap-3 border-t border-border pt-1.5">
            <span className="font-semibold text-fg">{wages.aheadBy > 0 ? 'مدفوع فوق أجر الحضور' : 'مستحق له الآن'}</span>
            <Amount amount={wages.aheadBy > 0 ? wages.aheadBy : wages.payableNow} tone={wages.aheadBy > 0 ? 'danger' : 'success'} className="text-md font-bold" />
          </p>
        </div>
      ) : (
        <p className="text-xs text-fg-muted">حدّد الأجر اليومي من «تعديل بيانات العامل» ليُحسب أجر الحضور.</p>
      )}
    </section>
  );
}
