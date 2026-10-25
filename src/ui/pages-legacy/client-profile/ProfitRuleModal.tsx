import { useId } from 'react';
import { Payment, ReceiptLong } from '../../../design-system/icons';
import { Amount, Badge, Button, Input, Modal } from '../../../design-system/primitives';
import { cn } from '../../../design-system/primitives/cn';
import { readProfitPercentage } from '../../../core/finance/profitRule';
import { computeProfitAmount } from '../../../core/finance/clientProfitTotals';
import type { ClientProfitBase } from '../../../types';
import { ChoiceOption } from './FormSheetKit';

const BASE_OPTIONS: {
  value: ClientProfitBase;
  title: string;
  hint: string;
  Icon: typeof Payment;
  isDefault?: boolean;
}[] = [
  {
    value: 'expenses',
    title: 'مجموع المصروفات',
    hint: 'تُحتسب كنسبة من إجمالي مصروفات المشروع الفعلية',
    Icon: ReceiptLong,
    isDefault: true,
  },
  {
    value: 'payments',
    title: 'إجمالي المدفوعات',
    hint: 'تُحتسب كنسبة من إجمالي التحصيلات والمبالغ المدفوعة',
    Icon: Payment,
  },
];

/**
 * نافذة تحديد النسبة المتفق عليها: أساس الاحتساب (المصروفات افتراضياً أو المدفوعات)
 * + النسبة المئوية + معاينة حية لقيمة النسبة.
 */
export function ProfitRuleModal({
  open,
  onClose,
  percentage,
  onPercentageChange,
  base,
  onBaseChange,
  totals,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  percentage: string;
  onPercentageChange: (v: string) => void;
  base: ClientProfitBase;
  onBaseChange: (b: ClientProfitBase) => void;
  totals: { totalExpenses: number; totalPaid: number };
  onSave: () => void;
}) {
  const groupName = useId();
  const read = readProfitPercentage(percentage);
  const enteredPct = read.ok ? read.value : 0;
  const baseAmount = base === 'payments' ? totals.totalPaid : totals.totalExpenses;
  const previewProfit = computeProfitAmount(base, enteredPct, totals);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تحديد النسبة المتفق عليها"
      description="اختر أساس الاحتساب وحدد النسبة المئوية للمشروع"
      maxWidth="md"
    >
      <div className="space-y-5">
        <div role="radiogroup" aria-label="أساس احتساب النسبة" className="space-y-2">
          <p className="text-sm font-medium text-fg-subtle">احتساب النسبة من</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {BASE_OPTIONS.map(({ value, title, hint, Icon, isDefault }) => {
              const active = base === value;
              return (
                <ChoiceOption
                  key={value}
                  name={groupName}
                  checked={active}
                  onSelect={() => onBaseChange(value)}
                  showCheck
                  className="items-start py-3"
                >
                  <Icon sx={{ fontSize: 22 }} className="mt-0.5 flex-none" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-base">
                      {title}
                      {isDefault && !active && <Badge>افتراضي</Badge>}
                    </span>
                    <span className={cn('mt-0.5 block text-xs font-normal leading-relaxed', active ? 'text-fg-subtle' : 'text-fg-muted')}>
                      {hint}
                    </span>
                  </span>
                </ChoiceOption>
              );
            })}
          </div>
        </div>

        <Input
          label="النسبة المتفق عليها (%)"
          type="text"
          inputMode="decimal"
          value={percentage}
          onChange={(e) => onPercentageChange(e.target.value)}
          placeholder="مثال: 10"
          hint="أدخل نسبة بين 0 وأقل من 100، أو اتركها فارغة لإلغاء النسبة"
          error={read.ok ? undefined : read.message}
          fieldSize="lg"
          rightIcon={<span className="text-base font-semibold text-fg-muted">%</span>}
        />

        <dl className="space-y-2 rounded-lg bg-surface-sunken p-4 text-sm" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-fg-subtle">
              {base === 'payments' ? 'إجمالي المدفوعات الحالية' : 'مجموع المصروفات الحالية'}
            </dt>
            <dd className="font-semibold tabular-nums text-fg">
              <Amount amount={baseAmount} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-fg-subtle">النسبة المدخلة</dt>
            <dd className="font-semibold tabular-nums text-fg">
              <bdi dir="ltr">{enteredPct}%</bdi>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <dt className="font-semibold text-fg">صافي النسبة المتوقعة</dt>
            <dd className="text-lg font-bold tabular-nums text-accent-ink">
              <Amount amount={previewProfit} />
            </dd>
          </div>
        </dl>

        <div className="flex gap-3">
          <Button className="flex-[2]" onClick={onSave} disabled={!read.ok}>
            حفظ النسبة
          </Button>
          <Button variant="outline" className="flex-1" onClick={onClose}>
            إلغاء
          </Button>
        </div>
      </div>
    </Modal>
  );
}
