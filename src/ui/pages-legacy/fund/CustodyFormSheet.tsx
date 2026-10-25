import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Delete } from '../../../design-system/icons';
import { Button, Input, Select, Sheet } from '../../../design-system/primitives';
import { cn } from '../../../design-system/primitives/cn';
import { formatAmountDisplay } from '../../../core/utils-formatters';
import { fromMilli, toMilli, type CustodyBatch } from '../../../core/finance/custodyProfile';
import { Money, RefTag, fieldInner, formatFundDate, todayInputValue } from './fundUi';
import type { FundUser } from './types';

export type CustodyFormValues = {
  userId: string;
  userName: string;
  amount: number;
  description: string;
  date: string;
  notes: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** العهدة قيد التعديل، أو null لعهدة جديدة. */
  editing: CustodyBatch | null;
  /** المستخدم المحدد مسبقاً عند الإضافة من ملفه. */
  initialUserId: string;
  users: FundUser[];
  /** العجز القائم على مستخدم (لمعاينة الخصم التلقائي). */
  deficitOf: (userId: string) => number;
  /** يرمي خطأ عند الفشل ليبقى النموذج مفتوحاً بما أُدخل. */
  onSubmit: (values: CustodyFormValues) => Promise<void>;
  /** حذف العهدة قيد التعديل (يطلب تأكيداً منفصلاً). */
  onDelete?: (batch: CustodyBatch) => void;
};

const QUICK_AMOUNTS = [10000, 20000, 30000, 50000];

type FormState = { userId: string; amount: string; description: string; date: string; notes: string };
type Errors = Partial<Record<'userId' | 'amount' | 'date' | 'form', string>>;

export function CustodyFormSheet({ open, onClose, editing, initialUserId, users, deficitOf, onSubmit, onDelete }: Props) {
  const [form, setForm] = useState<FormState>({ userId: '', amount: '', description: '', date: todayInputValue(), notes: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSaving(false);
    setForm(
      editing
        ? {
            userId: editing.source.userId || initialUserId,
            amount: String(editing.amount),
            description: editing.description,
            date: editing.date,
            notes: editing.notes ?? '',
          }
        : { userId: initialUserId, amount: '', description: '', date: todayInputValue(), notes: '' }
    );
  }, [open, editing, initialUserId]);

  const sortedUsers = useMemo(() => [...users].sort((a, b) => a.name.localeCompare(b.name, 'ar')), [users]);
  const userName = users.find((u) => u.id === form.userId)?.name ?? '';
  const amountNum = Number.parseFloat(form.amount);
  const amountOk = Number.isFinite(amountNum) && amountNum > 0;

  // معاينة: عجز المستخدم القائم يُخصم من العهدة الجديدة تلقائياً.
  const deficit = !editing && form.userId ? deficitOf(form.userId) : 0;
  const preview = amountOk && toMilli(deficit) > 0 ? fromMilli(toMilli(amountNum) - toMilli(deficit)) : null;

  const set = (patch: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => ({ ...e, form: undefined, ...Object.fromEntries(Object.keys(patch).map((k) => [k, undefined])) }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const next: Errors = {};
    if (!form.userId) next.userId = 'اختر المستخدم';
    if (!amountOk) next.amount = 'أدخل مبلغاً أكبر من صفر';
    if (!form.date) next.date = 'اختر التاريخ';
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        userId: form.userId,
        userName: userName || 'المستخدم',
        amount: fromMilli(toMilli(amountNum)),
        description: form.description.trim() || `عهدة ${userName || 'المستخدم'}`,
        date: form.date,
        notes: form.notes.trim(),
      });
    } catch {
      setErrors({ form: 'تعذر الحفظ. تحقق من الاتصال وحاول مرة أخرى، ولم يضع ما أدخلته.' });
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={saving ? () => undefined : onClose}
      maxWidth="sm"
      title={editing ? 'تعديل العهدة' : 'عهدة جديدة'}
      subtitle={
        editing ? (
          <>
            <RefTag value={editing.ref} /> · {formatFundDate(editing.date)}
          </>
        ) : (
          'منح رصيد لمستخدم، تُخصم مصروفاته منه تلقائياً'
        )
      }
      footer={
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            إلغاء
          </Button>
          <Button type="submit" form="custody-form" className="flex-[2]" loading={saving}>
            {editing ? 'حفظ التعديلات' : 'إضافة العهدة'}
          </Button>
        </div>
      }
    >
      <form id="custody-form" onSubmit={submit} noValidate className="space-y-5 px-4 py-5 lg:px-6">
        <Select
          label="المستخدم"
          required
          value={form.userId}
          error={errors.userId}
          onChange={(e) => set({ userId: e.target.value })}
          className={fieldInner}
        >
          <option value="">اختر المستخدم</option>
          {sortedUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>

        <div className="space-y-3">
          <Input
            label="مبلغ العهدة (د.ل)"
            required
            fieldSize="lg"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            dir="ltr"
            placeholder="0"
            value={form.amount}
            error={errors.amount}
            onChange={(e) => set({ amount: e.target.value })}
            calculator="حاسبة مبلغ العهدة"
            calculatorUnit="د.ل"
            className={`${fieldInner} text-end text-xl font-bold tabular-nums`}
          />
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="مبالغ سريعة">
            {QUICK_AMOUNTS.map((a) => {
              const active = amountOk && toMilli(amountNum) === toMilli(a);
              return (
                <button
                  key={a}
                  type="button"
                  aria-pressed={active}
                  onClick={() => set({ amount: String(a) })}
                  className={cn(
                    'h-11 rounded-md border text-sm font-semibold tabular-nums transition-[background-color,border-color,color,transform] duration-fast ease-out active:scale-[0.97]',
                    active
                      ? 'border-transparent bg-accent text-accent-on'
                      : 'border-border bg-surface-panel text-fg-subtle hover:border-border-strong hover:text-fg'
                  )}
                >
                  <bdi dir="ltr">{formatAmountDisplay(a)}</bdi>
                </button>
              );
            })}
          </div>
        </div>

        {preview !== null && (
          <div role="status" className="space-y-1 rounded-md bg-danger-soft px-4 py-3 text-sm leading-relaxed text-danger-ink">
            <p>
              على {userName || 'هذا المستخدم'} عجز قائم <Money value={deficit} />، وسيُخصم تلقائياً من هذه العهدة.
            </p>
            <p className="font-semibold">
              {preview >= 0 ? (
                <>
                  المتاح له بعد الخصم: <Money value={preview} />
                </>
              ) : (
                <>
                  المبلغ لا يغطي العجز كاملاً، يبقى عجز <Money value={preview} />
                </>
              )}
            </p>
          </div>
        )}

        <div className="space-y-4">
          <Input
            label="وصف العهدة"
            placeholder={userName ? `عهدة ${userName}` : 'مثال: عهدة تشغيل الشهر'}
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
            className={fieldInner}
          />
          <Input
            label="التاريخ"
            required
            type="date"
            value={form.date}
            error={errors.date}
            onChange={(e) => set({ date: e.target.value })}
            className={fieldInner}
          />
          <Input label="ملاحظات (اختياري)" value={form.notes} onChange={(e) => set({ notes: e.target.value })} className={fieldInner} />
        </div>

        {errors.form && (
          <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger-ink">
            {errors.form}
          </p>
        )}

        {editing && onDelete && (
          <div className="border-t border-border pt-4">
            <Button variant="danger-soft" block leftIcon={<Delete sx={{ fontSize: 20 }} />} disabled={saving} onClick={() => onDelete(editing)}>
              حذف العهدة
            </Button>
          </div>
        )}
      </form>
    </Sheet>
  );
}
