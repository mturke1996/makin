import { useRef, useState, type FormEvent } from 'react';
import { Amount, Button, Input, Section, Sheet, Textarea } from '../../../../design-system/primitives';
import type { Worker } from '../../../../types';
import { workerAgreementChanged } from '../../../../core/finance/workerLedgerHistory';
import { AgreementEditor } from './AgreementEditor';
import { draftFromWorker, draftTotal, validateDraft, type WorkerDraft, type WorkerDraftErrors } from './workerFormModel';
import type { WorkerFormValues } from './types';

const JOB_TYPES = ['كهرباء', 'سباكة', 'بلاط وسيراميك', 'دهان', 'نجارة', 'حدادة', 'بياض ولياسة', 'مقاول'];

interface WorkerFormSheetProps {
  open: boolean;
  onClose: () => void;
  clientName?: string;
  /** عامل للتعديل، أو لا شيء للإضافة. */
  edit?: Worker | null;
  /** يبدأ المحرر في وضع البنود (للتفصيل من الملف). */
  startItemized?: boolean;
  onSubmit: (values: WorkerFormValues) => Promise<void>;
}

/**
 * إضافة/تعديل عامل. الحالة محلية وتبدأ من الصفر عند كل فتح (يمرّر الأب key جديداً).
 * المبلغ المحفوظ دائماً يساوي مجموع البنود بالضبط عند وجودها.
 */
export function WorkerFormSheet({ open, onClose, clientName, edit, startItemized, onSubmit }: WorkerFormSheetProps) {
  const [draft, setDraft] = useState<WorkerDraft>(() => draftFromWorker(edit, { itemize: startItemized }));
  const [errors, setErrors] = useState<WorkerDraftErrors>({ line: {} });
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [agreementReason, setAgreementReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const saving = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const update = (next: WorkerDraft) => {
    setDraft(next);
    // بعد أول محاولة حفظ، تتحدّث الأخطاء مباشرة أثناء التصحيح.
    if (submitted) setErrors(validateDraft(next).errors);
  };

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (saving.current) return;
    const result = validateDraft(draft);
    setSubmitted(true);
    setErrors(result.errors);
    if (!result.values) {
      // ننقل التركيز لأول حقل خاطئ حتى لا يبحث عنه المستخدم.
      window.setTimeout(() => {
        const first = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
        first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        first?.focus({ preventScroll: true });
      }, 0);
      return;
    }
    if (edit && workerAgreementChanged(edit, result.values) && !agreementReason.trim()) {
      setReasonError('اكتب سبب تعديل الاتفاق ليبقى موثقاً في سجل العامل');
      window.setTimeout(() => formRef.current?.querySelector<HTMLElement>('[name="agreementReason"]')?.focus(), 0);
      return;
    }
    saving.current = true;
    setBusy(true);
    try {
      await onSubmit({ ...result.values, agreementReason: agreementReason.trim() });
    } catch {
      /* المخزن يعرض رسالة الخطأ، ونُبقي ما كتبه المستخدم */
    } finally {
      setBusy(false);
      saving.current = false;
    }
  };

  const total = draftTotal(draft);

  return (
    <Sheet
      open={open}
      onClose={() => { if (!saving.current) onClose(); }}
      title={edit ? 'تعديل بيانات العامل' : 'إضافة عامل'}
      subtitle={clientName}
      maxWidth="md"
      footer={
        <div className="flex items-center gap-4">
          <div className="min-w-0">
            <p className="text-2xs text-fg-muted">إجمالي الاتفاق</p>
            <Amount amount={total} className="text-lg font-bold text-fg" />
          </div>
          <Button type="submit" form="worker-form" size="lg" className="flex-1" loading={busy}>
            {edit ? 'حفظ التعديلات' : 'إضافة العامل'}
          </Button>
        </div>
      }
    >
      <form id="worker-form" ref={formRef} noValidate onSubmit={submit} className="space-y-8 p-4 pb-10 lg:p-6">
        <Section title="بيانات العامل">
          <Input
            label="اسم العامل أو المقاول"
            placeholder="الاسم الكامل أو اسم الفريق"
            value={draft.name}
            error={errors.name}
            autoComplete="off"
            enterKeyHint="next"
            required
            onChange={(e) => update({ ...draft, name: e.target.value })}
          />
          <div className="space-y-2">
            <Input
              label="نوع العمل"
              placeholder="كهرباء، سباكة، بلاط…"
              value={draft.jobType}
              autoComplete="off"
              enterKeyHint="next"
              onChange={(e) => update({ ...draft, jobType: e.target.value })}
            />
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" aria-label="اقتراحات نوع العمل">
              {JOB_TYPES.map((j) => (
                <button
                  key={j}
                  type="button"
                  onClick={() => update({ ...draft, jobType: j })}
                  className="inline-flex h-11 shrink-0 items-center rounded-full border border-border bg-surface-panel px-4 text-sm font-medium text-fg-subtle transition-colors duration-fast hover:border-border-strong hover:text-fg active:scale-[0.97]"
                >
                  {j}
                </button>
              ))}
            </div>
          </div>
          <Input
            label="رقم الهاتف (اختياري)"
            type="tel"
            inputMode="tel"
            dir="ltr"
            className="text-end"
            placeholder="09XXXXXXXX"
            value={draft.phone}
            error={errors.phone}
            autoComplete="tel"
            enterKeyHint="next"
            onChange={(e) => update({ ...draft, phone: e.target.value })}
          />
          <Input
            label="تاريخ بدء العمل (اختياري)"
            type="date"
            value={draft.startDate}
            onChange={(e) => update({ ...draft, startDate: e.target.value })}
          />
          <Textarea
            label="ملاحظات (اختياري)"
            rows={2}
            placeholder="شروط الاتفاق أو أي تفاصيل عن العامل"
            value={draft.notes}
            onChange={(e) => update({ ...draft, notes: e.target.value })}
          />
        </Section>

        <Section
          title="المبلغ المتفق عليه"
          description="اختر مبلغاً مقطوعاً، أو فصّله إلى بنود يظهر مجموعها كقيمة الاتفاق."
        >
          <AgreementEditor draft={draft} errors={errors} onChange={update} />
          {edit && (
            <Textarea
              label="سبب تعديل الاتفاق"
              name="agreementReason"
              rows={2}
              maxLength={1000}
              placeholder="مثال: إضافة أعمال عزل متفق عليها"
              hint="مطلوب عند تغيير مبلغ الاتفاق أو بنوده. يظهر في سجل العامل والتقرير."
              value={agreementReason}
              error={reasonError}
              onChange={(e) => { setAgreementReason(e.target.value); setReasonError(''); }}
            />
          )}
        </Section>
      </form>
    </Sheet>
  );
}
