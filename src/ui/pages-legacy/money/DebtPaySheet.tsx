import { useEffect, useState } from 'react';
import { Amount, Button, Input, ProgressBar, Sheet } from '../../../design-system/primitives';
import { formatCurrencyDisplay, isPartialDecimalInput, parseDecimalInput } from '../../../core/utils-formatters';
import type { StandaloneDebt } from '../../../types';
import { FormBody, FormFooter, FormSection } from './moneyUi';
import { fromMilli, toMilli } from './moneyUtils';
import type { DebtState } from './debtState';

interface Props {
  open: boolean;
  debt: StandaloneDebt | null;
  state: DebtState | null;
  onClose: () => void;
  onPay: (debt: StandaloneDebt, amount: number) => Promise<void>;
}

/** Record a (partial) payment against a standalone debt, with a live preview. */
export function DebtPaySheet({ open, debt, state, onClose, onPay }: Props) {
  const [value, setValue] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);

  const remainingNow = state?.remaining;
  const debtId = debt?.id;
  useEffect(() => {
    if (!open || remainingNow === undefined) return;
    setValue(String(remainingNow));
    setAttempted(false);
    setSaving(false);
  }, [open, debtId, remainingNow]);

  if (!debt || !state) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;

  const pay = parseDecimalInput(value) ?? 0;
  const payM = Math.min(toMilli(pay), toMilli(state.remaining));
  const remainingAfter = fromMilli(toMilli(state.remaining) - payM);
  const paidAfterPct = debt.amount > 0 ? ((toMilli(state.paid) + payM) / toMilli(debt.amount)) * 100 : 0;
  const over = pay > 0 && toMilli(pay) > toMilli(state.remaining);
  const error = attempted && !(pay > 0) ? 'أدخل مبلغاً أكبر من صفر' : undefined;

  const submit = async () => {
    setAttempted(true);
    if (!(pay > 0)) return;
    setSaving(true);
    try {
      await onPay(debt, pay);
      onClose();
    } catch {
      /* toasted by the store */
    } finally {
      setSaving(false);
    }
  };

  const rows: [string, number, string?][] = [
    ['قيمة الدين', debt.amount],
    ['المسدد سابقاً', state.paid, 'text-success-ink'],
    ['المتبقي', state.remaining, 'text-danger-ink'],
  ];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      mobile="bottom"
      maxWidth="sm"
      title="تسديد دين"
      subtitle={debt.partyName}
      footer={<FormFooter saveLabel="تأكيد التسديد" saving={saving} onSave={submit} />}
    >
      <FormBody>
        <dl className="divide-y divide-border rounded-md border border-border">
          {rows.map(([label, amount, tone]) => (
            <div key={label} className="flex min-h-12 items-center justify-between gap-3 px-3.5 py-2">
              <dt className="text-sm text-fg-subtle">{label}</dt>
              <dd className="text-md font-semibold">
                <Amount amount={amount} className={tone} />
              </dd>
            </div>
          ))}
        </dl>

        <FormSection title="مبلغ التسديد">
          <Input
            label="المبلغ"
            placeholder="0"
            value={value}
            onChange={(e) => isPartialDecimalInput(e.target.value) && setValue(e.target.value)}
            error={error}
            fieldSize="lg"
            inputMode="decimal"
            autoComplete="off"
            className="text-xl font-bold"
            rightIcon={<span className="text-sm font-semibold">د.ل</span>}
            calculator="حاسبة السداد"
            calculatorUnit="د.ل"
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setValue(String(state.remaining))}>
              المبلغ كاملاً
            </Button>
            <Button variant="outline" size="sm" onClick={() => setValue(String(fromMilli(Math.round(toMilli(state.remaining) / 2))))}>
              النصف
            </Button>
          </div>
          {over && (
            <p role="status" className="rounded-md bg-warning-soft px-3.5 py-2.5 text-sm text-warning-ink">
              المبلغ أكبر من المتبقي. سيُسجَّل التسديد حتى {formatCurrencyDisplay(state.remaining)} فقط.
            </p>
          )}
        </FormSection>

        <section aria-live="polite" className="space-y-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium text-fg-subtle">المتبقي بعد التسديد</span>
            <Amount
              amount={remainingAfter}
              tone={remainingAfter > 0 ? 'danger' : 'success'}
              className="text-xl font-bold"
            />
          </div>
          <ProgressBar value={paidAfterPct} tone={remainingAfter > 0 ? 'brand' : 'success'} size="md" label="نسبة المسدد بعد التسديد" />
          <p className="text-xs text-fg-muted">
            {remainingAfter > 0 ? 'يبقى الدين مفتوحاً حتى يُسدَّد المتبقي.' : 'سيُغلق الدين بعد هذا التسديد.'}
          </p>
        </section>
      </FormBody>
    </Sheet>
  );
}
