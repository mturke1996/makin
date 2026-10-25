import { Amount, Button, ListGroup, Section } from '../../../../design-system/primitives';
import { formatDecimalNumber, formatMeasureUnit } from '../../../../core/utils-formatters';
import type { WorkerLedger } from '../../../../core/finance/workerLedger';

interface AgreementBreakdownProps {
  ledger: WorkerLedger;
  /** فتح نموذج العامل (للمدير) لتفصيل الاتفاق إلى بنود. */
  onItemize?: () => void;
}

/** «تفصيل المبلغ المتفق عليه»: بنود بكمية × سعر وإجمالي كل بند، ثم الإجمالي. المبلغ المقطوع سطر واحد. */
export function AgreementBreakdown({ ledger, onItemize }: AgreementBreakdownProps) {
  const { lines, isItemized, agreed, storedAgreed, agreedDrift } = ledger;

  return (
    <Section
      title="تفصيل المبلغ المتفق عليه"
      description={isItemized ? `${lines.length} بند، ومجموعها هو قيمة الاتفاق` : 'اتفاق بمبلغ مقطوع'}
    >
      <ListGroup>
        {isItemized ? (
          lines.map((line) => {
            const unit = formatMeasureUnit(line.unit);
            return (
              <div key={line.id} className="flex items-start gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-base font-semibold leading-snug text-fg">{line.title || 'بند بلا وصف'}</p>
                  <p className="mt-0.5 text-xs tabular-nums text-fg-muted">
                    <bdi dir="ltr">{formatDecimalNumber(line.quantity)}</bdi>
                    {unit ? ` ${unit}` : ''} × <Amount amount={line.unitPrice} />
                  </p>
                  {line.note && <p className="mt-0.5 break-words text-xs text-fg-muted">{line.note}</p>}
                </div>
                <div className="flex-none text-end">
                  <Amount amount={line.total} className="text-base font-semibold text-fg" />
                  {line.total > 0 && (
                    <p className="mt-0.5 text-2xs tabular-nums text-fg-muted">
                      <bdi dir="ltr">{Math.round(line.share)}%</bdi> من الاتفاق
                    </p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-fg">مبلغ مقطوع</p>
              <p className="mt-0.5 text-xs text-fg-muted">اتفاق إجمالي بدون تفصيل بنود</p>
            </div>
            <Amount amount={agreed} className="flex-none text-base font-semibold text-fg" />
          </div>
        )}
        {isItemized && (
          <div className="flex items-center justify-between gap-3 bg-surface-sunken px-4 py-3.5">
            <span className="text-base font-semibold text-fg">إجمالي الاتفاق</span>
            <Amount amount={agreed} className="text-lg font-bold text-fg" />
          </div>
        )}
      </ListGroup>

      {isItemized && agreedDrift !== 0 && (
        <p className="px-1 text-xs leading-relaxed text-fg-muted">
          القيمة المحفوظة للاتفاق (<Amount amount={storedAgreed} />) تختلف عن مجموع البنود. المعتمد في الحساب هو مجموع البنود، وتتحدّث القيمة المحفوظة عند حفظ العامل.
        </p>
      )}

      {!isItemized && onItemize && (
        <Button variant="ghost" size="sm" onClick={onItemize}>
          فصّل الاتفاق إلى بنود
        </Button>
      )}
    </Section>
  );
}
