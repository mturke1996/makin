import { useEffect, useRef, useState, type FormEvent } from 'react';
import { WarningAmber } from '../../../../design-system/icons';
import { Amount, Button, Input, Sheet, Textarea } from '../../../../design-system/primitives';
import { formatCurrencyDisplay } from '../../../../core/utils-formatters';
import { fromMilli, subtractMoney, toMilli, type WorkerLedger, type WorkerLedgerPayment } from '../../../../core/finance/workerLedger';
import { exceedsEarnedBy, type WorkerProgressView } from '../../../../core/finance/workerProgress';
import type { Worker } from '../../../../types';
import { CustodyOverdraftNotice } from '../profileBanners';
import { numberToInput, parseNumberInput, todayDay } from './format';
import { NumberField } from './fields';
import type { WorkerPaymentValues } from './types';
import { clearWorkerPaymentDraft, readWorkerPaymentDraft, saveWorkerPaymentDraft, type WorkerPaymentDraft } from './workerPaymentDraft';
import { SAVE_TIMEOUT_MS, withTimeout } from '../../../quick-expense/quickExpenseLogic';

const NOTE_CHIPS = ['دفعة مقدمة', 'إنجاز مرحلة', 'دفعة نهائية', 'دفعة على الحساب'];

interface WorkerPaymentSheetProps {
  open: boolean;
  onClose: () => void;
  worker: Worker;
  ledger: WorkerLedger;
  /** The approved progress against what he has been paid, for the advance and the early-payment notices. */
  progress: WorkerProgressView;
  /** Account-scoped drafts never appear for another signed-in user. */
  draftScope: string;
  /** الدفعة قيد التعديل، أو لا شيء لدفعة جديدة. */
  edit?: WorkerLedgerPayment | null;
  /** رصيد عهدة المستخدم لإظهار تنبيه التجاوز كما في نموذج المصروف. */
  fundStats?: { remaining: number } | null;
  onSubmit: (values: WorkerPaymentValues) => Promise<void>;
}

/** صرف دفعة لعامل أو تعديلها: المبلغ، التاريخ، الملاحظة، ومعاينة المتبقي قبل الحفظ. */
export function WorkerPaymentSheet({ open, onClose, worker, ledger, progress, draftScope, edit, fundStats, onSubmit }: WorkerPaymentSheetProps) {
  const scope = `${draftScope}:${worker.clientId}`;
  const [initial] = useState<WorkerPaymentDraft>(() => (!edit && readWorkerPaymentDraft(scope, worker.id)) || {
    operationId: edit?.id ?? crypto.randomUUID(), createdAt: edit?.createdAt ?? new Date().toISOString(),
    amountText: edit ? numberToInput(edit.amount) : '', date: edit?.day || todayDay(), note: edit?.note ?? '', attempted: false, advance: !!edit?.expense.isWorkerAdvance,
  });
  const [amountText, setAmountText] = useState(initial.amountText);
  const [date, setDate] = useState(initial.date);
  const [note, setNote] = useState(initial.note);
  const [attempted, setAttempted] = useState(initial.attempted);
  const [advance, setAdvance] = useState(!!initial.advance);
  const [saveError, setSaveError] = useState(initial.attempted ? 'هذه الدفعة لها محاولة حفظ غير مؤكدة. أعد المحاولة بنفس المرجع والبيانات لتأكيدها دون تكرار.' : '');
  const [errors, setErrors] = useState<{ amount?: string; date?: string }>({});
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const saving = useRef(false);
  const completed = useRef(false);
  const draft = (): WorkerPaymentDraft => ({ ...initial, amountText, date, note, attempted, advance });
  useEffect(() => {
    if (!edit && !completed.current && (amountText || note || attempted)) saveWorkerPaymentDraft(scope, worker.id, { ...initial, amountText, date, note, attempted, advance });
  }, [edit, scope, worker.id, initial, amountText, date, note, attempted, advance]);

  // عند التعديل نحسب «قبل هذه الدفعة» بإرجاع مبلغها إلى المتبقي.
  const editedAmount = edit?.amount ?? 0;
  const remainingBefore = fromMilli(toMilli(ledger.remaining) + toMilli(editedAmount));
  const paidBefore = subtractMoney(ledger.paid, editedAmount);

  const parsed = parseNumberInput(amountText);
  const amount = parsed != null && parsed > 0 ? fromMilli(toMilli(parsed)) : 0;
  const remainingAfter = subtractMoney(remainingBefore, amount);
  const exceeds = amount > 0 && remainingAfter < 0;
  // Against the approved progress: how far this payment would take the paid total past what the work has earned.
  const pastEarned = amount > 0 ? exceedsEarnedBy(progress, amount, editedAmount) : 0;

  const validate = () => {
    const next: { amount?: string; date?: string } = {};
    if (amount <= 0 || amount > 1000000000) next.amount = 'أدخل مبلغًا أكبر من صفر وبحد أقصى مليار دينار';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) next.date = 'اختر تاريخ دفعة صحيحًا';
    setErrors(next);
    return next;
  };

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (saving.current) return;
    const found = validate();
    if (found.amount || found.date) {
      window.setTimeout(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0);
      return;
    }
    saving.current = true;
    setBusy(true);
    setSaveError('');
    if (!edit) {
      saveWorkerPaymentDraft(scope, worker.id, { ...draft(), attempted: true });
      setAttempted(true);
    }
    try {
      const work = onSubmit({ amount, date, note: note.trim(), operationId: initial.operationId, createdAt: initial.createdAt, advance });
      void work.then(() => {
        completed.current = true;
        if (!edit) clearWorkerPaymentDraft(scope, worker.id);
      }, () => {});
      await withTimeout(work, SAVE_TIMEOUT_MS, 'لم يتأكد الحفظ بعد');
    } catch (cause) {
      const code = (cause as { code?: string })?.code?.replace('firestore/', '');
      if (!edit && ['permission-denied', 'invalid-argument', 'failed-precondition', 'not-found'].includes(code ?? '')) {
        setAttempted(false);
      }
      setSaveError(edit ? 'تعذر تأكيد التعديل. بقيت البيانات كما كتبتها، ويمكنك إعادة المحاولة.' : 'لم يتأكد حفظ الدفعة. أعد المحاولة بنفس المرجع والبيانات؛ يُحفظ الطلب عند إغلاق النافذة لإكماله لاحقاً.');
    } finally {
      setBusy(false);
      saving.current = false;
    }
  };

  const addNoteChip = (chip: string) => {
    setNote((cur) => {
      const t = cur.trim();
      if (!t || NOTE_CHIPS.includes(t)) return chip;
      return t.includes(chip) ? t : `${t}، ${chip}`;
    });
  };

  return (
    <Sheet
      open={open}
      onClose={() => { if (!saving.current) onClose(); }}
      mobile="bottom"
      maxWidth="sm"
      title={edit ? 'تعديل الدفعة' : 'صرف دفعة'}
      subtitle={worker.name}
      footer={
        <Button type="submit" form="worker-payment-form" size="lg" block loading={busy}>
          {edit ? 'حفظ التعديل' : attempted ? 'إعادة محاولة تأكيد الدفعة' : amount > 0 ? `تسجيل ${formatCurrencyDisplay(amount)}` : 'تسجيل الدفعة'}
        </Button>
      }
    >
      <form id="worker-payment-form" ref={formRef} noValidate onSubmit={submit} className="space-y-5 p-4 pb-6">
        {saveError && <p role="status" className="rounded-md bg-warning-soft p-3 text-sm leading-relaxed text-warning-ink">{saveError}</p>}
        {!edit && attempted && <p className="break-all text-xs text-fg-muted">مرجع الدفعة: <bdi dir="ltr">{initial.operationId}</bdi></p>}
        <fieldset disabled={busy || (!edit && attempted)} className="space-y-5">
        <dl className="grid grid-cols-3 gap-3 rounded-md bg-surface-sunken p-3.5">
          <div className="min-w-0">
            <dt className="text-2xs text-fg-muted">المتفق عليه</dt>
            <dd className="mt-0.5 text-sm font-bold text-fg">
              <Amount amount={ledger.agreed} />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-2xs text-fg-muted">{edit ? 'مدفوع قبلها' : 'المدفوع'}</dt>
            <dd className="mt-0.5 text-sm font-bold text-fg">
              <Amount amount={paidBefore} />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-2xs text-fg-muted">{edit ? 'متبقٍ قبلها' : 'المتبقي'}</dt>
            <dd className="mt-0.5 text-sm font-bold text-fg">
              <Amount amount={remainingBefore} tone={remainingBefore < 0 ? 'danger' : 'inherit'} />
            </dd>
          </div>
        </dl>

        <div className="space-y-2.5">
          <NumberField
            label="مبلغ الدفعة"
            placeholder="0"
            fieldSize="lg"
            enterKeyHint="next"
            value={amountText}
            error={errors.amount}
            calculator="حاسبة المبلغ"
            calculatorUnit="د.ل"
            onValueChange={(v) => {
              setAmountText(v);
              if (errors.amount) setErrors((er) => ({ ...er, amount: undefined }));
            }}
          />
          {remainingBefore > 0 && (
            <button
              type="button"
              onClick={() => setAmountText(numberToInput(remainingBefore))}
              className="inline-flex h-11 items-center rounded-full border border-border bg-surface-panel px-4 text-sm font-medium text-fg-subtle transition-colors duration-fast hover:border-border-strong hover:text-fg active:scale-[0.97]"
            >
              سداد المتبقي كاملاً
            </button>
          )}
          <div className="flex items-center justify-between gap-3 px-1">
            <span className="text-sm text-fg-subtle">المتبقي بعد هذه الدفعة</span>
            <Amount
              amount={remainingAfter}
              tone={remainingAfter < 0 ? 'danger' : remainingAfter === 0 && amount > 0 ? 'success' : 'neutral'}
              className="text-lg font-bold"
            />
          </div>
          {exceeds && (
            <div role="status" className="flex items-start gap-2.5 rounded-md bg-warning-soft p-3.5 text-warning-ink">
              <WarningAmber sx={{ fontSize: 20 }} aria-hidden className="mt-0.5 flex-none" />
              <p className="text-sm leading-relaxed">
                هذه الدفعة تتجاوز المتفق عليه بمقدار <Amount amount={Math.abs(remainingAfter)} bare /> د.ل. يمكنك المتابعة إذا كان ذلك مقصوداً.
              </p>
            </div>
          )}
          {progress.percent !== null && (
            <div className="flex items-center justify-between gap-3 px-1 text-sm">
              <span className="text-fg-subtle">
                المستحق الآن بعد خصم السلف <span className="text-fg-muted">(إنجاز <bdi dir="ltr">{progress.percent}%</bdi>)</span>
              </span>
              <Amount amount={progress.payableNow} className="font-bold" />
            </div>
          )}
          {pastEarned > 0 && !advance && (
            <div role="status" className="flex items-start gap-2.5 rounded-md bg-warning-soft p-3.5 text-warning-ink">
              <WarningAmber sx={{ fontSize: 20 }} aria-hidden className="mt-0.5 flex-none" />
              <p className="text-sm leading-relaxed">
                هذه الدفعة تسبق الإنجاز المعتمد بمقدار <Amount amount={pastEarned} bare /> د.ل. إن كانت سلفة فعلّمها أدناه لتُخصم من الإنجاز القادم.
              </p>
            </div>
          )}
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-border bg-surface-panel p-3">
            <input type="checkbox" className="mt-1 size-5 flex-none accent-[var(--brand-accent,#C9972B)]" checked={advance} onChange={(e) => setAdvance(e.target.checked)} />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-fg">هذه سلفة</span>
              <span className="block text-xs leading-relaxed text-fg-muted">مال يُدفع قبل إنجاز العمل. يُخصم تلقائياً مما يستحقه العامل كلما زاد الإنجاز، ويظهر في كشفه وإيصاله.</span>
            </span>
          </label>
          <CustodyOverdraftNotice stats={fundStats} amount={amount > 0 ? amount : ''} originalAmount={editedAmount} />
        </div>

        <div className="space-y-2.5">
          <Textarea
            label="ملاحظة الدفعة"
            rows={3}
            placeholder="اكتب سبب الدفعة أو ما تغطيه، لتظهر في سجل العامل"
            value={note}
            maxLength={2000}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" aria-label="ملاحظات سريعة">
            {NOTE_CHIPS.map((chip) => {
              const active = note.trim() === chip;
              return (
                <button
                  key={chip}
                  type="button"
                  aria-pressed={active}
                  onClick={() => addNoteChip(chip)}
                  className={`inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors duration-fast active:scale-[0.97] ${
                    active
                      ? 'border-transparent bg-accent-soft text-accent-ink'
                      : 'border-border bg-surface-panel text-fg-subtle hover:border-border-strong hover:text-fg'
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>
        </div>

        <Input
          label="تاريخ الدفعة"
          type="date"
          value={date}
          error={errors.date}
          onChange={(e) => {
            setDate(e.target.value);
            if (errors.date) setErrors((er) => ({ ...er, date: undefined }));
          }}
        />
        </fieldset>
      </form>
    </Sheet>
  );
}
