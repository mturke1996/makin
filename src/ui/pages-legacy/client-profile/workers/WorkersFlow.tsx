import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDataSlice } from '../../../../stores/useDataStore';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { useAccess } from '../../../../core/access/useAccess';
import { formatCurrencyDisplay } from '../../../../core/utils-formatters';
import { summarizeWorkerLedgers, type WorkerLedgerPayment } from '../../../../core/finance/workerLedger';
import { agreementRevision, revisedAgreementHistory, workerAgreementChanged } from '../../../../core/finance/workerLedgerHistory';
import type { Worker } from '../../../../types';
import type { WorkerReportPeriod } from '../../../../features/pdf/workerReportModel';
import { ConfirmModal, type ConfirmRequest } from './ConfirmModal';
import { WorkerFormSheet } from './WorkerFormSheet';
import { WorkerPaymentSheet } from './WorkerPaymentSheet';
import { WorkerProfileSheet } from './WorkerProfileSheet';
import { WorkersSheet } from './WorkersSheet';
import { formatDay } from './format';
import type { WorkerEntry, WorkerFormValues, WorkerPaymentValues } from './types';

/**
 * حالة نافذة عابرة: تبقى قيمتها بعد الإغلاق ليكتمل أنيميشن الخروج، ويتغيّر `session`
 * عند كل فتح جديد فتبدأ النماذج من الصفر.
 */
function useOverlay<T>() {
  const [state, setState] = useState<{ value: T | null; session: number; open: boolean }>({ value: null, session: 0, open: false });
  const show = useCallback((value: T) => setState((s) => ({ value, session: s.session + 1, open: true })), []);
  const hide = useCallback(() => setState((s) => ({ ...s, open: false })), []);
  return { ...state, show, hide };
}

/** مهلة بين إغلاق طبقة وفتح/إغلاق أخرى، لتبقى مؤشرات سجل الرجوع متسلسلة. */
const OVERLAY_SETTLE_MS = 280;

interface WorkersFlowProps {
  initialWorkerId?: string;
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName?: string;
  /** عمال العميل مع دفاترهم: الأرصدة من كل دفعات العامل، والدفعات المعروضة هي المسموحة للمستخدم. */
  entries: WorkerEntry[];
  /** رصيد عهدة المستخدم لتنبيه التجاوز عند صرف دفعة. */
  fundStats?: { remaining: number } | null;
  pdfLoading: boolean;
  /** كشوف PDF تحتاج الصورة الكاملة، فتُمرَّر فقط حيث يظهر ملخص العميل. */
  onDownloadPdf?: () => void;
  onSharePdf?: () => void;
  onStatementPdf?: (entry: WorkerEntry, period?: WorkerReportPeriod) => void;
  onShareStatement?: (entry: WorkerEntry, period?: WorkerReportPeriod) => void;
}

/**
 * مسار العمال داخل ملف العميل: القائمة ← ملف العامل ← نموذج العامل / نموذج الدفعة.
 * كل مستوى نافذة فوق السابقة، فيعود الرجوع إلى حيث كان المستخدم.
 */
export function WorkersFlow({
  open, onClose, clientId, clientName, entries, fundStats, pdfLoading, onDownloadPdf, onSharePdf, onStatementPdf, onShareStatement, initialWorkerId,
}: WorkersFlowProps) {
  const { addWorker, updateWorker, addExpense, updateExpense, deleteExpense, isLoading } = useDataSlice('addWorker', 'updateWorker', 'addExpense', 'updateExpense', 'deleteExpense', 'isLoading');
  const user = useAuthStore((s) => s.user);
  const access = useAccess();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const initialExists = entries.some(entry => entry.worker.id === initialWorkerId);
  useEffect(() => {
    if (open && initialWorkerId && initialExists) { setSelectedId(initialWorkerId); setProfileOpen(true); }
  }, [open, initialWorkerId, initialExists]);
  const form = useOverlay<{ edit: Worker | null; itemize: boolean; operationId: string; createdAt: string }>();
  const payment = useOverlay<{ workerId: string; edit: WorkerLedgerPayment | null }>();
  const confirm = useOverlay<ConfirmRequest>();
  const [confirmBusy, setConfirmBusy] = useState(false);

  // نحتفظ بآخر عامل عُرض حتى لا يفرغ الملف أثناء إغلاقه بعد الحذف.
  const lastEntry = useRef<WorkerEntry | null>(null);
  const found = selectedId ? entries.find((e) => e.worker.id === selectedId) ?? null : null;
  if (found) lastEntry.current = found;
  const selected = found ?? (selectedId && lastEntry.current?.worker.id === selectedId ? lastEntry.current : null);
  const paymentEntry = payment.value ? entries.find((e) => e.worker.id === payment.value!.workerId) ?? null : null;

  const totals = useMemo(() => summarizeWorkerLedgers(entries.map((e) => e.ledger)), [entries]);

  // إضافة العمال وتعديلهم وصرف الدفعات: `workers.manage`. أما دفعة موجودة فهي مصروف له مالك،
  // وسياسة المصروفات هي التي تقرر من يعدّلها ومن يحذفها (ولا تُعدَّل المغلقة في فاتورة مصروفات).
  const canManage = access.can('workers.manage');
  const canEditPayment = (p: WorkerLedgerPayment) => access.canEditExpense(p.expense);
  const canDeletePayment = (p: WorkerLedgerPayment) => access.canDeleteExpense(p.expense);

  // عند إغلاق القائمة (من أي مصدر) نغلق ما فوقها ونبدأ من القائمة في المرة التالية.
  const hideForm = form.hide;
  const hidePayment = payment.hide;
  const hideConfirm = confirm.hide;
  useEffect(() => {
    if (open) return;
    setProfileOpen(false);
    hideForm();
    hidePayment();
    hideConfirm();
  }, [open, hideForm, hidePayment, hideConfirm]);

  // الطبقات تُغلق من الأعلى فقط (نافذة فوق نموذج فوق قائمة).
  const upperOpen = form.open || payment.open || confirm.open;
  const profileShown = open && profileOpen && !!selected;
  const closeList = () => {
    if (profileShown || upperOpen) return;
    onClose();
  };
  const closeProfile = () => {
    if (upperOpen) return;
    setProfileOpen(false);
  };

  const openProfile = (workerId: string) => {
    setSelectedId(workerId);
    setProfileOpen(true);
  };

  const openWorkerForm = (edit: Worker | null, itemize = false) => form.show({ edit, itemize, operationId: crypto.randomUUID(), createdAt: new Date().toISOString() });

  const saveWorker = async (values: WorkerFormValues) => {
    if (!canManage) throw new Error('not-allowed');
    const now = new Date().toISOString();
    const edit = form.value?.edit ?? null;
    const fields = {
      name: values.name,
      jobType: values.jobType,
      phone: values.phone,
      startDate: values.startDate,
      notes: values.notes,
      totalAmount: values.totalAmount,
      agreementItems: values.agreementItems,
    };
    if (edit) {
      if (workerAgreementChanged(edit, fields) && !values.agreementReason?.trim()) throw new Error('agreement-reason-required');
      const agreementHistory = revisedAgreementHistory(edit, fields, {
        recordedAt: now, recordedBy: user?.id ?? '', recordedByName: user?.displayName ?? 'المستخدم', reason: values.agreementReason ?? '',
      }, form.value!.operationId);
      // الحالة (نشط/مكتمل) لا تتغير بالتعديل.
      await updateWorker(edit.id, { ...fields, ...(agreementHistory.length ? { agreementHistory } : {}), updatedAt: now }, edit.updatedAt);
      form.hide();
      return;
    }
    const id = form.value!.operationId;
    const createdAt = form.value!.createdAt;
    await addWorker({
      id,
      clientId,
      ...fields,
      paidAmount: 0,
      remainingAmount: values.totalAmount,
      status: 'active',
      agreementHistory: [agreementRevision(fields, {
        recordedAt: createdAt, recordedBy: user?.id ?? '', recordedByName: user?.displayName ?? 'المستخدم', reason: 'تسجيل الاتفاق الأول',
      }, 'created', `${id}-agreement`)],
      createdAt,
      updatedAt: createdAt,
    });
    form.hide();
    window.setTimeout(() => openProfile(id), OVERLAY_SETTLE_MS);
  };

  const savePayment = async (values: WorkerPaymentValues) => {
    const target = payment.value;
    const worker = paymentEntry?.worker;
    if (!target || !worker) return;
    const edit = target.edit?.expense ?? null;
    // لا يعرض الواجهة طريقاً إلى هنا دون الصلاحية؛ هذا يمنع شاشة قديمة من الكتابة.
    if (edit ? !access.canEditExpense(edit) : !canManage || !user?.id) throw new Error('not-allowed');
    const now = new Date().toISOString();
    if (edit) {
      // المالك (userId, createdBy) يُحدَّد عند الإنشاء فقط: القواعد ترفض تغيير المالك.
      await updateExpense(edit.id, {
        description: edit.description || `دفعة حساب: ${worker.name}`,
        amount: values.amount,
        category: 'labor',
        date: values.date,
        notes: values.note,
        workerId: worker.id,
        workerName: worker.name,
        updatedAt: now,
      });
    } else {
      // الدفعة مصروف جديد يملكه من صرفها.
      await addExpense({
        id: values.operationId,
        clientId,
        description: `دفعة حساب: ${worker.name}`,
        amount: values.amount,
        category: 'labor',
        date: values.date,
        notes: values.note,
        isClosed: false,
        createdAt: values.createdAt,
        updatedAt: values.createdAt,
        workerId: worker.id,
        workerName: worker.name,
        userId: user!.id,
        createdBy: user?.displayName || 'المستخدم',
      });
    }
    payment.hide();
  };

  const ask = (request: ConfirmRequest) => confirm.show(request);
  const runConfirm = async () => {
    const req = confirm.value;
    if (!req || confirmBusy) return;
    setConfirmBusy(true);
    try {
      await req.onConfirm();
      confirm.hide();
      if (req.afterClose) window.setTimeout(req.afterClose, OVERLAY_SETTLE_MS);
    } catch {
      /* المخزن يعرض رسالة الخطأ */
    } finally {
      setConfirmBusy(false);
    }
  };

  const requestDeletePayment = (p: WorkerLedgerPayment) => {
    const ordinal = selected ? selected.ledger.payments.findIndex((x) => x.id === p.id) + 1 : 0;
    ask({
      title: `حذف الدفعة ${ordinal}؟`,
      description: `${formatCurrencyDisplay(p.amount)} بتاريخ ${formatDay(p.day)}`,
      details: (
        <>
          <p>تُحذف الدفعة نهائياً من سجل العامل ومن مصروفات المشروع، ويرجع المبلغ إلى المتبقي للعامل.</p>
          {p.note && <p className="mt-2 text-fg-muted">الملاحظة: {p.note}</p>}
        </>
      ),
      confirmLabel: 'حذف الدفعة',
      onConfirm: async () => {
        await deleteExpense(p.id);
      },
    });
  };

  const requestArchiveWorker = (entry: WorkerEntry) => {
    const restoring = !!entry.worker.archivedAt;
    ask({
      title: `${restoring ? 'استعادة' : 'أرشفة'} ${entry.worker.name}؟`,
      description: restoring ? 'يعود إلى قائمة العمال الحالية.' : 'يبقى ملف العامل واتفاقه وسجله ودفعاته محفوظاً.',
      details: <p>{entry.ledger.remaining > 0 ? `يبقى المستحق للعامل ${formatCurrencyDisplay(entry.ledger.remaining)} ظاهراً في الإجماليات والتقارير. ` : ''}يمكن فتح الأرشيف أو استعادة العامل في أي وقت.</p>,
      confirmLabel: restoring ? 'استعادة العامل' : 'أرشفة العامل',
      tone: 'primary',
      onConfirm: async () => {
        await updateWorker(entry.worker.id, { archivedAt: restoring ? '' : new Date().toISOString(), archivedBy: restoring ? '' : user?.id ?? '', updatedAt: new Date().toISOString() }, entry.worker.updatedAt);
      },
    });
  };

  const toggleCompleted = (entry: WorkerEntry) => {
    const completing = entry.worker.status !== 'completed';
    const apply = async () => {
      await updateWorker(entry.worker.id, { status: completing ? 'completed' : 'active', updatedAt: new Date().toISOString() }, entry.worker.updatedAt);
    };
    if (completing && entry.ledger.remaining !== 0) {
      ask({
        title: 'تعليم العمل كمكتمل؟',
        description: entry.ledger.remaining > 0 ? `ما زال للعامل ${formatCurrencyDisplay(entry.ledger.remaining)} غير مدفوع.` : undefined,
        details: <p>تعليم العمل كمكتمل لا يغيّر الدفعات ولا المتبقي، ويمكنك إعادة فتحه في أي وقت.</p>,
        confirmLabel: 'تعليم كمكتمل',
        tone: 'primary',
        onConfirm: apply,
      });
      return;
    }
    void apply();
  };

  const paymentCtx = payment.value && paymentEntry ? paymentEntry : null;
  const paymentFundStats = payment.value?.edit && payment.value.edit.expense.userId !== user?.id ? null : fundStats;

  return (
    <>
      <WorkersSheet
        open={open}
        onClose={closeList}
        clientName={clientName}
        entries={entries}
        totals={totals}
        loading={isLoading}
        canManage={canManage}
        onAdd={() => openWorkerForm(null)}
        onOpen={openProfile}
        pdfLoading={pdfLoading}
        onDownloadPdf={onDownloadPdf}
        onSharePdf={onSharePdf}
      />

      <WorkerProfileSheet
        open={profileShown}
        onClose={closeProfile}
        clientName={clientName}
        entry={selected}
        canManage={canManage}
        canEditPayment={canEditPayment}
        canDeletePayment={canDeletePayment}
        onPay={() => selected && payment.show({ workerId: selected.worker.id, edit: null })}
        onEditPayment={(p) => selected && payment.show({ workerId: selected.worker.id, edit: p })}
        onDeletePayment={requestDeletePayment}
        onEditWorker={(opts) => selected && openWorkerForm(selected.worker, !!opts?.itemize)}
        onToggleCompleted={() => selected && toggleCompleted(selected)}
        onArchiveWorker={() => selected && requestArchiveWorker(selected)}
        onStatementPdf={onStatementPdf && selected ? (period) => onStatementPdf(selected, period) : undefined}
        onShareStatement={onShareStatement && selected ? (period) => onShareStatement(selected, period) : undefined}
        pdfLoading={pdfLoading}
      />

      {form.value && (
        <WorkerFormSheet
          key={`form-${form.session}`}
          open={open && form.open}
          onClose={form.hide}
          clientName={clientName}
          edit={form.value.edit}
          startItemized={form.value.itemize}
          onSubmit={saveWorker}
        />
      )}

      {paymentCtx && (
        <WorkerPaymentSheet
          key={`payment-${payment.session}`}
          open={open && payment.open}
          onClose={payment.hide}
          worker={paymentCtx.worker}
          draftScope={user?.id ?? ''}
          ledger={paymentCtx.ledger}
          edit={payment.value?.edit ?? null}
          fundStats={paymentFundStats}
          onSubmit={savePayment}
        />
      )}

      <ConfirmModal
        open={open && confirm.open}
        request={confirm.value}
        busy={confirmBusy}
        onClose={confirm.hide}
        onConfirm={runConfirm}
      />
    </>
  );
}
