import { WarningAmber } from '../../../../design-system/icons';
import { Amount, Badge, Button, ProgressBar } from '../../../../design-system/primitives';
import { displayProgress, type WorkerLedger } from '../../../../core/finance/workerLedger';
import { LEDGER_STATUS_META, formatDay } from './format';

interface WorkerMoneySummaryProps {
  ledger: WorkerLedger;
  /** تعديل الاتفاق (للمدير) يظهر داخل تنبيه الزيادة. */
  onEditAgreement?: () => void;
}

/** ملخص مالي واحد للعامل: المتبقي أولاً، ثم التقدم، ثم المتفق عليه والمدفوع. */
export function WorkerMoneySummary({ ledger, onEditAgreement }: WorkerMoneySummaryProps) {
  const meta = LEDGER_STATUS_META[ledger.status];
  const overpaid = ledger.status === 'overpaid';
  const settled = ledger.status === 'settled';
  const pct = displayProgress(ledger);
  const tone = settled ? 'success' : overpaid ? 'danger' : 'brand';

  return (
    <section aria-label="ملخص حساب العامل" className="space-y-3">
      <div className="rounded-lg border border-border bg-surface-panel p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-fg-muted">{overpaid ? 'دُفع أكثر من المتفق بمقدار' : 'المتبقي للعامل'}</p>
            <p className="mt-1 text-3xl font-bold leading-tight">
              <Amount
                amount={overpaid ? ledger.overpaidBy : ledger.remaining}
                tone={settled ? 'success' : 'danger'}
              />
            </p>
          </div>
          <Badge tone={meta.tone} dot>
            {meta.label}
          </Badge>
        </div>

        <div className="mt-4">
          <ProgressBar value={ledger.progress} tone={tone} size="md" label="نسبة المدفوع من المتفق عليه" />
          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-fg-muted">
            <span className="tabular-nums">{pct}% مدفوع</span>
            <span className="tabular-nums">
              {ledger.lastPaymentDay ? `آخر دفعة ${formatDay(ledger.lastPaymentDay)}` : 'لم تُسجَّل دفعات بعد'}
            </span>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4">
          <div className="min-w-0">
            <dt className="text-xs text-fg-muted">المتفق عليه</dt>
            <dd className="mt-0.5 text-lg font-bold text-fg">
              <Amount amount={ledger.agreed} />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-fg-muted">المدفوع</dt>
            <dd className="mt-0.5 text-lg font-bold text-fg">
              <Amount amount={ledger.paid} />
            </dd>
          </div>
        </dl>
      </div>

      {overpaid && (
        <div role="status" className="flex items-start gap-3 rounded-lg bg-danger-soft p-4 text-danger-ink">
          <WarningAmber sx={{ fontSize: 22 }} aria-hidden className="mt-0.5 flex-none" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">المدفوع يتجاوز المتفق عليه</p>
            <p className="mt-1 text-sm leading-relaxed">
              دُفع <Amount amount={ledger.overpaidBy} bare /> د.ل زيادة عن الاتفاق. راجع الدفعات في السجل، أو عدّل قيمة الاتفاق إذا زاد حجم العمل.
            </p>
            {onEditAgreement && (
              <Button size="sm" variant="outline" className="mt-3" onClick={onEditAgreement}>
                تعديل الاتفاق
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
