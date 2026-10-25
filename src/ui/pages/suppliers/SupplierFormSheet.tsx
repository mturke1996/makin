import { useState } from 'react';
import { Button, Input, Sheet, Textarea } from '../../../design-system/primitives';
import { findSupplierByName } from '../../../core/finance/supplierLedger';
import type { Supplier } from '../../../types';

export interface SupplierFormValues {
  name: string;
  phone: string;
  supplies: string;
  notes: string;
}

interface Props {
  edit: Supplier | null;
  /** The directory, to refuse a second supplier with the same name. */
  suppliers: Supplier[];
  onClose: () => void;
  onSubmit: (values: SupplierFormValues) => Promise<void>;
  onDelete?: () => void;
}

export function SupplierFormSheet({ edit, suppliers, onClose, onSubmit, onDelete }: Props) {
  const [values, setValues] = useState<SupplierFormValues>({ name: edit?.name ?? '', phone: edit?.phone ?? '', supplies: edit?.supplies ?? '', notes: edit?.notes ?? '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<SupplierFormValues>) => { setValues((v) => ({ ...v, ...patch })); setError(''); };

  const submit = async () => {
    const name = values.name.trim();
    if (!name) return setError('اكتب اسم المورّد');
    if (name.length > 120) return setError('الاسم طويل جداً');
    const twin = findSupplierByName(suppliers, name);
    if (twin && twin.id !== edit?.id) return setError('يوجد مورّد بهذا الاسم في الدليل');
    setBusy(true);
    try {
      await onSubmit({ ...values, name });
    } catch {
      /* the store already told the person */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open
      onClose={() => !busy && onClose()}
      title={edit ? 'تعديل المورّد' : 'مورّد جديد'}
      subtitle="من تشتري منه المواد"
      maxWidth="sm"
      mobile="bottom"
      footer={
        <div className="flex items-center gap-3">
          {edit && onDelete && (
            <Button variant="danger-soft" disabled={busy} onClick={onDelete}>حذف</Button>
          )}
          <Button className="flex-1" size="lg" loading={busy} onClick={() => void submit()}>{edit ? 'حفظ التعديلات' : 'إضافة المورّد'}</Button>
        </div>
      }
    >
      <div className="space-y-4 p-4 pb-6">
        <Input label="اسم المورّد" value={values.name} error={error || undefined} autoComplete="off" placeholder="مثال: مؤسسة النور لمواد البناء" onChange={(e) => set({ name: e.target.value })} />
        <Input label="الهاتف (اختياري)" type="tel" inputMode="tel" dir="ltr" className="text-end" value={values.phone} placeholder="09XXXXXXXX" onChange={(e) => set({ phone: e.target.value })} />
        <Input label="ما يورّده (اختياري)" value={values.supplies} placeholder="مثال: أسمنت، حديد، رمل" onChange={(e) => set({ supplies: e.target.value })} />
        <Textarea label="ملاحظات (اختياري)" rows={2} value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
      </div>
    </Sheet>
  );
}
