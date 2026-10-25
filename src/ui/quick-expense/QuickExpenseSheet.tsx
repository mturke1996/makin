import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Input, Sheet, Amount } from '../../design-system/primitives';
import {
  ACTIVE_EXPENSE_CATEGORY_IDS,
  getExpenseCategoryDefaultUnit,
  getExpenseCategoryLabel,
} from '../../core/expenseCategories';
import { formatFirebaseError } from '../../core/formatFirebaseError';
import { firebaseConfig } from '../../config/firebase';
import { useAuthStore } from '../../stores/useAuthStore';
import { useDataStore } from '../../stores/useDataStore';
import { expensesService } from '../../services/firebaseService';
import type { Expense } from '../../types';
import { AmountEntry } from './AmountEntry';
import { QuantityEntry } from './QuantityEntry';
import { CategoryChoice } from './CategoryChoice';
import { ClientChoice, ClientPicker } from './ClientChoice';
import { CustodyLine } from './CustodyLine';
import { EmployeePicker } from './EmployeePicker';
import { SavedSummary, type SavedInfo } from './SavedSummary';
import { readQuickPrefs, writeQuickPrefs } from './quickPrefs';
import {
  clearQuickDraft,
  readQuickDraft,
  writeQuickDraft,
  type QuickDraft,
} from './quickDraft';
import {
  buildQuickExpense,
  calculateQuickQuantity,
  DEFAULT_CATEGORY,
  defaultDescription,
  findPossibleDuplicate,
  localISODate,
  parseAmount,
  previewCustody,
  sameQuickExpenseRequest,
  SAVE_TIMEOUT_MS,
  withTimeout,
} from './quickExpenseLogic';
import { useQuickExpenseModel } from './useQuickExpenseModel';
import { repeatExpenseDraft, quickPhaseBudget } from './repeatExpense';

interface QuickExpenseSheetProps {
  open: boolean;
  onClose: () => void;
  initialClientId?: string;
  initialPhaseId?: string;
}
type Phase = 'form' | 'saving' | 'done';
const projectId = firebaseConfig.projectId;

/** A durable draft and immutable operation ID keep a slow connection from creating duplicate expenses. */
export default function QuickExpenseSheet({
  open,
  onClose,
  initialClientId,
  initialPhaseId,
}: QuickExpenseSheetProps) {
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const [restored] = useState(() => readQuickDraft(projectId, userId));
  const [prefs, setPrefs] = useState(() =>
    readQuickPrefs(userId, undefined, projectId),
  );
  const [draft, setDraft] = useState<QuickDraft>(
    () =>
      restored ?? {
        clientId: initialClientId ?? '',
        category:
          prefs.category &&
          ACTIVE_EXPENSE_CATEGORY_IDS.includes(
            prefs.category as (typeof ACTIVE_EXPENSE_CATEGORY_IDS)[number],
          )
            ? prefs.category
            : DEFAULT_CATEGORY,
        mode: 'amount',
        amount: '',
        quantity: '',
        unitPrice: '',
        unit: '',
        description: '',
        invoiceNumber: '',
        notes: '',
        date: localISODate(),
        phaseId: initialPhaseId ?? '',
        personId: '',
      },
  );
  const {
    access,
    me,
    owner,
    ownerIsMe,
    clients,
    expenses,
    loading,
    canPickPerson,
    people,
    remaining,
  } = useQuickExpenseModel(draft.personId);
  const addExpense = useDataStore((s) => s.addExpense);
  const projectPhases = useDataStore((s) => s.projectPhases);
  const [phase, setPhase] = useState<Phase>('form');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<SavedInfo | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [confirmedConflict, setConfirmedConflict] = useState(false);
  const operation = useRef<Expense | undefined>(restored?.operation);
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const patch = (change: Partial<QuickDraft>) => {
    if (!operation.current) {
      setDraft((d) => ({ ...d, ...change }));
      setError('');
    }
  };
  const client = clients.find((c) => c.id === draft.clientId);
  const quantity = calculateQuickQuantity(draft.quantity, draft.unitPrice);
  const amountValue =
    draft.mode === 'quantity' ? quantity.amount : parseAmount(draft.amount);
  const categoryLabel = getExpenseCategoryLabel(draft.category);
  const preview =
    remaining === null ? null : previewCustody(remaining, amountValue);
  const locked = !!draft.operation || phase === 'saving';
  const phases = access.can('projects.view')
    ? projectPhases.filter((p) => p.clientId === draft.clientId)
    : [];
  const budget =
    access.expenseScope === 'all'
      ? quickPhaseBudget(
          phases.find((phase) => phase.id === draft.phaseId),
          expenses,
          draft.clientId,
          amountValue,
        )
      : null;
  const repeatable = expenses
    .filter(
      (expense) =>
        expense.userId === me.id &&
        !expense.workerId &&
        clients.some((client) => client.id === expense.clientId),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);
  const duplicate = findPossibleDuplicate(expenses, {
    clientId: draft.clientId,
    userId: owner.id,
    category: draft.category as Expense['category'],
    amount: amountValue,
    date: draft.date,
  });
  const validDate =
    /^\d{4}-\d{2}-\d{2}$/.test(draft.date) &&
    !Number.isNaN(Date.parse(draft.date)) &&
    new Date(draft.date).toISOString().slice(0, 10) === draft.date;
  const canSave =
    !busy.current &&
    phase !== 'saving' &&
    (!!draft.operation ||
      (!!client &&
        amountValue > 0 &&
        amountValue <= 999999999 &&
        validDate &&
        (draft.mode !== 'quantity' || !quantity.error)));

  useEffect(() => {
    if (phase !== 'done') writeQuickDraft(projectId, userId, draft);
  }, [draft, userId, phase]);

  const complete = (expense: Expense) => {
    clearQuickDraft(projectId, userId, expense.id);
    if (!mounted.current || operation.current?.id !== expense.id) return;
    operation.current = undefined;
    const nextPrefs = {
      ...prefs,
      clientId: expense.clientId,
      category: expense.category,
    };
    writeQuickPrefs(me.id, nextPrefs, undefined, projectId);
    setPrefs(nextPrefs);
    setSaved({
      reference: expense.id,
      amount: expense.amount,
      clientName:
        clients.find((c) => c.id === expense.clientId)?.name ?? 'المشروع',
      categoryLabel: getExpenseCategoryLabel(expense.category),
      forName: expense.userId === me.id ? undefined : expense.createdBy,
      custody:
        remaining === null ? null : previewCustody(remaining, expense.amount),
    });
    setError('');
    setPhase('done');
    setDraft((d) => ({ ...d, operation: undefined }));
    navigator.vibrate?.(12);
  };

  // A cached optimistic snapshot is never treated as proof of a completed write.
  useEffect(() => {
    const pending = restored?.operation;
    if (!pending) return;
    let alive = true;
    void expensesService
      .getConfirmedById(pending.id)
      .then((found) => {
        if (!alive || !found) return;
        if (sameQuickExpenseRequest(found, pending)) complete(pending);
        else {
          setConfirmedConflict(true);
          setError(
            'المعرّف محفوظ ببيانات مختلفة. راجع قائمة المصروفات قبل إجراء عملية جديدة.',
          );
        }
      })
      .catch(() => {
        if (alive)
          setError(
            'هناك عملية سابقة قيد التحقق. اتصل بالإنترنت واضغط التحقق وإعادة المحاولة.',
          );
      });
    return () => {
      alive = false;
    };
    // The opening snapshot is deliberately immutable for the lifetime of this sheet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!canSave || busy.current) return;
    if (!access.can('expenses.create') || (!ownerIsMe && !canPickPerson)) {
      setError('لا تملك صلاحية تسجيل هذا المصروف');
      return;
    }
    if (navigator.onLine === false) {
      setError(
        'لا يوجد اتصال. المسودة محفوظة على هذا الجهاز، اتصل ثم أعد المحاولة.',
      );
      return;
    }
    const expense =
      operation.current ??
      buildQuickExpense({
        id: crypto.randomUUID(),
        now: new Date(),
        clientId: draft.clientId,
        amount: amountValue,
        category: draft.category,
        description: draft.description,
        fallbackDescription: defaultDescription(categoryLabel, client?.name),
        invoiceNumber: draft.invoiceNumber,
        owner,
        date: draft.date,
        notes: draft.notes,
        ...(access.can('projects.view') &&
        phases.some((p) => p.id === draft.phaseId)
          ? { phaseId: draft.phaseId }
          : {}),
        ...(draft.mode === 'quantity'
          ? {
              quantity: quantity.quantity,
              unitPrice: quantity.unitPrice,
              unit: draft.unit,
            }
          : {}),
      });
    const pending = { ...draft, operation: expense };
    if (!writeQuickDraft(projectId, userId, pending)) {
      setError(
        'تعذّر حفظ مرجع العملية على الجهاز. اسمح بالتخزين في المتصفح ثم أعد المحاولة.',
      );
      return;
    }
    operation.current = expense;
    setDraft(pending);
    busy.current = true;
    setPhase('saving');
    setError('');
    const work = addExpense(expense);
    void work.then(
      () => complete(expense),
      () => {},
    );
    try {
      await withTimeout(
        work,
        SAVE_TIMEOUT_MS,
        'تأخر تأكيد الحفظ. البيانات مقفلة لحماية العملية؛ أعد التحقق بنفس المرجع.',
      );
    } catch (cause) {
      if (!mounted.current || operation.current?.id !== expense.id) return;
      const code = (cause as { code?: string })?.code?.replace(
        'firestore/',
        '',
      );
      if (code === 'operation-conflict') setConfirmedConflict(true);
      if (
        [
          'permission-denied',
          'invalid-argument',
          'not-found',
          'failed-precondition',
        ].includes(code ?? '')
      ) {
        operation.current = undefined;
        setDraft((d) => ({ ...d, operation: undefined }));
      }
      setError(
        cause instanceof Error && (!code || code === 'operation-conflict')
          ? cause.message
          : formatFirebaseError(cause),
      );
      setPhase('form');
    } finally {
      busy.current = false;
    }
  };
  const another = () => {
    operation.current = undefined;
    setConfirmedConflict(false);
    clearQuickDraft(projectId, userId);
    setDraft((d) => ({
      ...d,
      operation: undefined,
      amount: '',
      quantity: '',
      unitPrice: '',
      description: '',
      invoiceNumber: '',
      notes: '',
      date: localISODate(),
    }));
    setSaved(null);
    setError('');
    setPhase('form');
  };
  const toggleFavorite = (key: string) => {
    const favorites = prefs.favorites ?? [];
    const next = {
      ...prefs,
      favorites: favorites.includes(key)
        ? favorites.filter((k) => k !== key)
        : [...favorites, key].slice(-12),
    };
    setPrefs(next);
    writeQuickPrefs(me.id, next, undefined, projectId);
  };
  const chooseClient = (id: string) => patch({ clientId: id, phaseId: '' });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      mobile="bottom"
      maxWidth="md"
      title="مصروف سريع"
      subtitle={`تسجيل باسم: ${owner.name}`}
      footer={
        phase === 'done' ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              تم
            </Button>
            <Button block onClick={another}>
              مصروف آخر
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {error && (
              <p
                role="alert"
                className="rounded-md bg-danger-soft p-3 text-sm leading-relaxed text-danger-ink"
              >
                {error}
              </p>
            )}
            {draft.operation && (
              <p
                role="status"
                className="text-xs leading-relaxed text-fg-subtle"
              >
                هناك طلب لم يتأكد حفظه بعد. إعادة المحاولة تتحقق منه بالمرجع
                نفسه وتحمي من التكرار.
              </p>
            )}
            <Button
              block
              loading={phase === 'saving'}
              disabled={!canSave}
              onClick={() => void save()}
            >
              {draft.operation ? 'التحقق وإعادة المحاولة' : 'تسجيل المصروف'}
            </Button>
            {confirmedConflict && (
              <Button block variant="outline" onClick={another}>
                راجعت المصروف المسجل، بدء عملية جديدة
              </Button>
            )}
            {!draft.operation && (
              <p className="text-center text-xs text-fg-muted">
                {!client ? (
                  'اختر العميل أولًا'
                ) : amountValue <= 0 ? (
                  'أدخل المبلغ أو الكمية والسعر'
                ) : (
                  <>
                    سيُسجل <Amount amount={amountValue} /> على {client.name}
                  </>
                )}
              </p>
            )}
          </div>
        )
      }
    >
      {phase === 'done' && saved ? (
        <SavedSummary info={saved} />
      ) : (
        <fieldset
          disabled={locked}
          className="min-w-0 space-y-5 px-4 py-4 lg:px-6"
        >
          {restored && (
            <p className="text-xs text-fg-muted">
              استُعيدت المسودة المحفوظة على هذا الجهاز.
            </p>
          )}
          {repeatable.length > 0 && (
            <Button variant="outline" block onClick={() => setRepeatOpen(true)}>
              إعادة استخدام مصروف سابق
            </Button>
          )}
          <Group title="العميل / المشروع">
            <ClientChoice
              clients={clients}
              open={pickerOpen}
              selectedId={draft.clientId}
              onOpenPicker={() => setPickerOpen(true)}
              loading={loading}
            />
          </Group>
          <Group title="فئة المصروف">
            <CategoryChoice
              value={draft.category}
              onChange={(category) =>
                patch({
                  category,
                  unit: getExpenseCategoryDefaultUnit(category) || draft.unit,
                })
              }
              favorites={prefs.favorites ?? []}
              onToggleFavorite={toggleFavorite}
            />
          </Group>
          <div className="space-y-3">
            <div
              className="flex gap-2"
              role="group"
              aria-label="طريقة حساب المصروف"
            >
              {(['amount', 'quantity'] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={draft.mode === mode ? 'secondary' : 'outline'}
                  className="min-w-0 flex-1 px-2"
                  aria-pressed={draft.mode === mode}
                  onClick={() => patch({ mode })}
                >
                  {mode === 'amount' ? 'مبلغ مباشر' : 'كمية × سعر'}
                </Button>
              ))}
            </div>
            {draft.mode === 'amount' ? (
              <AmountEntry
                value={draft.amount}
                onChange={(amount) => patch({ amount })}
              />
            ) : (
              <QuantityEntry
                quantity={draft.quantity}
                unitPrice={draft.unitPrice}
                unit={draft.unit}
                onQuantity={(quantity) => patch({ quantity })}
                onPrice={(unitPrice) => patch({ unitPrice })}
                onUnit={(unit) => patch({ unit })}
              />
            )}
            {preview && (
              <CustodyLine
                preview={preview}
                who={ownerIsMe ? undefined : owner.name}
              />
            )}
            {budget && amountValue > 0 && (
              <div
                role="status"
                className={`rounded-md p-3 text-sm ${budget.over ? 'bg-warning-soft text-warning-ink' : 'bg-info-soft text-info-ink'}`}
              >
                <p className="font-semibold">
                  {budget.over
                    ? 'سيتجاوز المصروف ميزانية المرحلة'
                    : 'أثر المصروف على ميزانية المرحلة'}
                </p>
                <p className="mt-1">
                  {budget.over ? 'التجاوز المتوقع: ' : 'المتبقي بعده: '}
                  <Amount amount={budget.over || budget.remaining} />
                </p>
              </div>
            )}
          </div>
          <Input
            label="الوصف (اختياري)"
            placeholder={defaultDescription(categoryLabel, client?.name)}
            value={draft.description}
            onChange={(e) => patch({ description: e.target.value })}
          />
          {duplicate && !draft.operation && (
            <p
              role="status"
              className="rounded-md bg-warning-soft p-3 text-sm leading-relaxed text-warning-ink"
            >
              يوجد مصروف بنفس المبلغ والفئة والعميل والتاريخ. راجعه قبل التسجيل
              إذا كان العملية نفسها.
            </p>
          )}
          <details className="rounded-lg border border-border px-3">
            <summary className="flex min-h-12 cursor-pointer items-center text-sm font-semibold text-fg-subtle">
              التاريخ والمرحلة وتفاصيل إضافية
            </summary>
            <div className="space-y-4 pb-4">
              <Input
                label="تاريخ المصروف"
                type="date"
                value={draft.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
              {phases.length > 0 && (
                <label className="block space-y-1 text-sm text-fg-subtle">
                  <span>مرحلة المشروع (اختياري)</span>
                  <select
                    value={draft.phaseId}
                    onChange={(e) => patch({ phaseId: e.target.value })}
                    className="h-12 w-full rounded-md border border-border bg-surface-panel px-3 text-base text-fg"
                  >
                    <option value="">غير محددة</option>
                    {phases.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <Input
                label="رقم الفاتورة (اختياري)"
                value={draft.invoiceNumber}
                onChange={(e) => patch({ invoiceNumber: e.target.value })}
              />
              <Input
                label="ملاحظات (اختياري)"
                value={draft.notes}
                onChange={(e) => patch({ notes: e.target.value })}
              />
              {canPickPerson && (
                <Group title="لمن هذا المصروف؟">
                  <EmployeePicker
                    me={me}
                    people={people}
                    value={owner.id}
                    onChange={(personId) =>
                      patch({ personId: personId === me.id ? '' : personId })
                    }
                  />
                </Group>
              )}
            </div>
          </details>
        </fieldset>
      )}
      {!locked && (
        <ClientPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          clients={clients}
          selectedId={draft.clientId}
          onSelect={chooseClient}
        />
      )}
      <Sheet
        open={repeatOpen && !locked}
        onClose={() => setRepeatOpen(false)}
        title="إعادة استخدام مصروف"
        subtitle="تُنسخ التفاصيل لمسودة جديدة بتاريخ اليوم، ثم تراجعها قبل الحفظ"
        mobile="bottom"
        maxWidth="md"
      >
        <div className="divide-y divide-border px-4">
          {repeatable.map((expense) => (
            <button
              key={expense.id}
              type="button"
              onClick={() => {
                patch(
                  repeatExpenseDraft(
                    expense,
                    projectPhases,
                    access.can('projects.view'),
                  ),
                );
                setRepeatOpen(false);
              }}
              className="flex min-h-20 w-full items-center justify-between gap-3 py-4 text-start"
            >
              <span className="min-w-0">
                <span className="block break-words text-base font-semibold text-fg">
                  {expense.description}
                </span>
                <span className="text-xs text-fg-subtle">
                  {
                    clients.find((client) => client.id === expense.clientId)
                      ?.name
                  }{' '}
                  · {getExpenseCategoryLabel(expense.category)}
                </span>
              </span>
              <Amount
                amount={expense.amount}
                className="shrink-0 text-base font-bold"
              />
            </button>
          ))}
        </div>
      </Sheet>
    </Sheet>
  );
}
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2" aria-label={title}>
      <h3 className="text-sm font-semibold text-fg-subtle">{title}</h3>
      {children}
    </section>
  );
}
