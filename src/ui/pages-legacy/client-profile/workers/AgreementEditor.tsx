import { Add, Delete } from '../../../../design-system/icons';
import { Amount, Button, IconButton, Input, Segmented } from '../../../../design-system/primitives';
import { NumberField } from './fields';
import {
  emptyLine, lineDraftTotal, switchMode,
  type LineDraft, type WorkerDraft, type WorkerDraftErrors,
} from './workerFormModel';

const UNIT_SUGGESTIONS = ['نقطة', 'م²', 'م³', 'م.ط', 'قطعة', 'لوحة', 'باب', 'يوم', 'طن', 'كغ', 'مقطوعية'];

interface AgreementEditorProps {
  draft: WorkerDraft;
  errors: WorkerDraftErrors;
  onChange: (next: WorkerDraft) => void;
}

function LineEditor({
  index, line, errors, canRemove, onChange, onRemove,
}: {
  index: number;
  line: LineDraft;
  errors?: WorkerDraftErrors['line'][string];
  canRemove: boolean;
  onChange: (next: LineDraft) => void;
  onRemove: () => void;
}) {
  const set = (patch: Partial<LineDraft>) => onChange({ ...line, ...patch });
  const total = lineDraftTotal(line);
  return (
    <div className="space-y-3 py-5 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-fg">البند {index + 1}</h4>
        {canRemove && (
          <IconButton label={`حذف البند ${index + 1}`} variant="ghost" onClick={onRemove} className="-me-2">
            <Delete sx={{ fontSize: 20 }} />
          </IconButton>
        )}
      </div>
      <Input
        label="وصف البند"
        placeholder="مثال: تمديد نقاط الإنارة"
        value={line.title}
        error={errors?.title}
        enterKeyHint="next"
        onChange={(e) => set({ title: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="الكمية"
          placeholder="0"
          value={line.quantity}
          error={errors?.quantity}
          calculator="حاسبة الكمية"
          enterKeyHint="next"
          onValueChange={(quantity) => set({ quantity })}
        />
        <Input
          label="الوحدة (اختياري)"
          placeholder="نقطة، م²…"
          list="worker-agreement-units"
          value={line.unit}
          enterKeyHint="next"
          onChange={(e) => set({ unit: e.target.value })}
        />
      </div>
      <NumberField
        label="سعر الوحدة"
        placeholder="0"
        value={line.unitPrice}
        error={errors?.unitPrice}
        calculator="حاسبة السعر"
        calculatorUnit="د.ل"
        enterKeyHint="done"
        onValueChange={(unitPrice) => set({ unitPrice })}
      />
      <div className="flex items-center justify-between gap-3 rounded-md bg-surface-sunken px-3.5 py-2.5">
        <span className="text-sm text-fg-subtle">إجمالي البند</span>
        <Amount amount={total} className="text-base font-bold text-fg" />
      </div>
    </div>
  );
}

/** محرر الاتفاق: مبلغ مقطوع واحد، أو بنود كمية × سعر بإجمالي حي. */
export function AgreementEditor({ draft, errors, onChange }: AgreementEditorProps) {
  return (
    <div className="space-y-4">
      <Segmented
        aria-label="طريقة تسجيل الاتفاق"
        value={draft.mode}
        onChange={(mode) => onChange(switchMode(draft, mode))}
        options={[
          { value: 'lump', label: 'مبلغ مقطوع' },
          { value: 'items', label: 'بنود مفصّلة' },
        ]}
      />

      {draft.mode === 'lump' ? (
        <NumberField
          label="المبلغ المتفق عليه"
          placeholder="0"
          fieldSize="lg"
          value={draft.lump}
          error={errors.lump}
          hint="يمكنك لاحقاً تفصيله إلى بنود من تعديل العامل."
          calculator="حاسبة المبلغ"
          calculatorUnit="د.ل"
          enterKeyHint="done"
          onValueChange={(lump) => onChange({ ...draft, lump })}
        />
      ) : (
        <>
          <div className="divide-y divide-border">
            {draft.lines.map((line, i) => (
              <LineEditor
                key={line.id}
                index={i}
                line={line}
                errors={errors.line[line.id]}
                canRemove={draft.lines.length > 1}
                onChange={(next) => onChange({ ...draft, lines: draft.lines.map((l) => (l.id === line.id ? next : l)) })}
                onRemove={() => onChange({ ...draft, lines: draft.lines.filter((l) => l.id !== line.id) })}
              />
            ))}
          </div>
          {errors.lines && (
            <p role="alert" className="text-xs text-danger-ink">
              {errors.lines}
            </p>
          )}
          <Button
            variant="outline"
            block
            leftIcon={<Add sx={{ fontSize: 20 }} />}
            onClick={() => onChange({ ...draft, lines: [...draft.lines, emptyLine()] })}
          >
            إضافة بند
          </Button>
        </>
      )}

      <datalist id="worker-agreement-units">
        {UNIT_SUGGESTIONS.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>
    </div>
  );
}
