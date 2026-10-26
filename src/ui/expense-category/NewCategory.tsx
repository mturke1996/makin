import { useState } from 'react';
import { Add } from '../../design-system/icons';
import { Button, Input } from '../../design-system/primitives';
import { categoryLabelProblem, findCategoryByLabel, MAX_CATEGORY_LABEL } from '../../core/expenseCategories';
import { useDataStore } from '../../stores/useDataStore';

interface NewCategoryFormProps {
  /** Called with the id of the new category (or of the one that already had this name). */
  onCreated: (id: string) => void;
  onCancel?: () => void;
  initialLabel?: string;
  autoFocus?: boolean;
}

/** A name, one button: the category is written to the database and chosen at once. */
export function NewCategoryForm({ onCreated, onCancel, initialLabel = '', autoFocus }: NewCategoryFormProps) {
  const addCustomCategory = useDataStore((s) => s.addCustomCategory);
  const [label, setLabel] = useState(initialLabel);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const existing = label.trim() ? findCategoryByLabel(label) : undefined;
  const problem = touched ? categoryLabelProblem(label) : null;

  const submit = async () => {
    if (busy) return;
    setTouched(true);
    if (categoryLabelProblem(label)) return;
    setBusy(true);
    try {
      onCreated(await addCustomCategory(label));
    } catch {
      /* the store has said why */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface-subtle p-3" role="group" aria-label="إضافة فئة جديدة">
      <Input
        label="اسم الفئة الجديدة"
        value={label}
        maxLength={MAX_CATEGORY_LABEL}
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder="مثل: ستائر، زجاج سيكوريت، تأمين"
        error={problem ?? undefined}
        hint={existing ? `موجودة مسبقاً باسم «${existing.label}»، سيتم اختيارها.` : undefined}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          // Enter adds the category; it must never send the expense form that contains this field.
          if (e.key === 'Enter') {
            e.preventDefault();
            void submit();
          }
        }}
      />
      <div className="flex gap-2">
        <Button type="button" block loading={busy} onClick={() => void submit()}>
          {existing ? 'اختيار الفئة' : 'إضافة الفئة واختيارها'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            إلغاء
          </Button>
        )}
      </div>
    </div>
  );
}

/** Under a category select: «not in the list? add it», opening the form in place. */
export function NewCategoryLink({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  if (open) {
    return (
      <NewCategoryForm
        autoFocus
        onCancel={() => setOpen(false)}
        onCreated={(id) => {
          setOpen(false);
          onCreated(id);
        }}
      />
    );
  }
  return (
    <Button type="button" variant="ghost" size="sm" leftIcon={<Add aria-hidden sx={{ fontSize: 18 }} />} onClick={() => setOpen(true)}>
      الفئة غير موجودة؟ أضف فئة جديدة
    </Button>
  );
}
