import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Amount, Input } from '../../../design-system/primitives';
import { parseDecimalInput, formatDate } from '../../../core/utils-formatters';
import { SCHEDULE_PRESETS, splitContract, type MilestoneDraft } from '../../../core/finance/paymentSchedule';
import { FormField, FormSection, FormSheetShell, FormDateInput, MoneyField } from './FormSheetKit';
import { FilterChip } from './records/filterControls';

const CUSTOM = 'custom';
const MAX_PARTS = 24;

interface GenerateScheduleSheetProps {
  /** The value to split: what is left of the contract after the instalments already scheduled. */
  suggestedTotal: number;
  /** The agreed contract value, when there is one (decides what the amount hint says). */
  contractValue?: number;
  /** Instalments already in the schedule; the new ones follow them. */
  existingCount: number;
  onClose: () => void;
  onSubmit: (drafts: MilestoneDraft[]) => Promise<unknown>;
}

/** «Split the contract»: a few taps to lay out the whole schedule instead of typing each instalment. */
export function GenerateScheduleSheet({ suggestedTotal, contractValue, existingCount, onClose, onSubmit }: GenerateScheduleSheetProps) {
  const [totalText, setTotalText] = useState(suggestedTotal > 0 ? String(suggestedTotal) : '');
  const [presetId, setPresetId] = useState(SCHEDULE_PRESETS[1].id);
  const [customCount, setCustomCount] = useState('4');
  const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [intervalDays, setIntervalDays] = useState('30');

  const total = parseDecimalInput(totalText) ?? 0;
  const weights = useMemo(() => {
    if (presetId !== CUSTOM) return SCHEDULE_PRESETS.find((p) => p.id === presetId)?.weights ?? [];
    const n = Math.min(MAX_PARTS, Math.max(0, Math.floor(Number(customCount) || 0)));
    return Array.from({ length: n }, () => 1);
  }, [presetId, customCount]);

  const drafts = useMemo(
    () => splitContract(total, weights, { startDate, intervalDays: Math.max(0, Math.floor(Number(intervalDays) || 0)) }),
    [total, weights, startDate, intervalDays],
  );
  const shareSum = weights.reduce((a, b) => a + b, 0);
  const ready = drafts.length >= 1 && !!startDate;

  return (
    <FormSheetShell
      tone="info"
      title="تقسيم قيمة العقد"
      subtitle="توزيع المبلغ على دفعات بمواعيدها"
      amount={total || undefined}
      amountLabel="المبلغ المراد تقسيمه"
      onClose={onClose}
      onSubmit={() => (ready ? onSubmit(drafts) : undefined)}
      submitLabel={ready ? `إنشاء ${drafts.length} دفعات` : 'إنشاء الدفعات'}
      maxWidth="md"
    >
      <FormSection title="المبلغ">
        <MoneyField
          label="القيمة التي توزَّع"
          value={totalText}
          onChange={(e) => setTotalText(e.target.value)}
          hint={
            suggestedTotal > 0
              ? 'المقترح هو المتبقي من قيمة العقد بعد الدفعات المجدولة.'
              : contractValue && contractValue > 0
                ? 'الجدول يغطي قيمة العقد كلها، فاكتب مبلغ الدفعات الإضافية.'
                : 'لم تُحدَّد قيمة العقد، فاكتب المبلغ هنا.'
          }
        />
      </FormSection>

      <FormSection title="طريقة التقسيم">
        <div className="flex flex-wrap gap-2" role="group" aria-label="طريقة التقسيم">
          {SCHEDULE_PRESETS.map((preset) => (
            <FilterChip key={preset.id} selected={presetId === preset.id} onClick={() => setPresetId(preset.id)}>
              {preset.label}
            </FilterChip>
          ))}
          <FilterChip selected={presetId === CUSTOM} onClick={() => setPresetId(CUSTOM)}>
            عدد مخصص
          </FilterChip>
        </div>
        {presetId === CUSTOM && (
          <Input
            label="عدد الدفعات المتساوية"
            type="number"
            inputMode="numeric"
            value={customCount}
            onChange={(e) => setCustomCount(e.target.value)}
            hint={`من 2 إلى ${MAX_PARTS} دفعة.`}
          />
        )}
      </FormSection>

      <FormSection title="المواعيد">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="موعد الدفعة الأولى">
            <FormDateInput value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </FormField>
          <Input
            label="الفاصل بين الدفعات (يوماً)"
            type="number"
            inputMode="numeric"
            value={intervalDays}
            onChange={(e) => setIntervalDays(e.target.value)}
          />
        </div>
      </FormSection>

      <FormSection title="المعاينة" description={existingCount > 0 ? `تُضاف بعد ${existingCount} دفعات موجودة في الجدول.` : undefined}>
        {drafts.length === 0 ? (
          <p className="text-sm text-fg-muted">اكتب المبلغ واختر طريقة التقسيم لتظهر الدفعات هنا.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-panel">
            {drafts.map((draft, i) => (
              <li key={i} className="flex items-center gap-3 px-3.5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-fg">{draft.title}</p>
                  <p className="mt-0.5 text-xs tabular-nums text-fg-muted">
                    {formatDate(draft.dueDate)}
                    <span className="mx-1.5" aria-hidden>·</span>
                    <bdi dir="ltr">{Math.round((weights[i] / shareSum) * 1000) / 10}%</bdi>
                  </p>
                </div>
                <span className="flex-none text-sm font-semibold tabular-nums text-fg">
                  <Amount amount={draft.amount} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </FormSection>
    </FormSheetShell>
  );
}
