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
  buildQuickExpense,
  calculateQuickQuantity,
  DEFAULT_CATEGORY,
  defaultDescription,
  findPossibleDuplicate,
  localISODate,
  parseAmount,
  previewCustody,
  type QuickForm,
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

/**
 * One quick entry: fill, press, done. The expense has a fixed id for the whole entry, so pressing again after a failure
 * rewrites the same record instead of making a second one. Nothing is kept on the device.
 */
export default function QuickExpenseSheet({
  open,
  onClose,
  initialClientId,
  initialPhaseId,
}: QuickExpenseSheetProps) {
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const [prefs, setPrefs] = useState(() =>
    readQuickPrefs(userId, undefined, projectId),
  );
  const [draft, setDraft] = useState<QuickForm>(
    () => ({
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
      }),
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
  /** The identity of this entry, created at the first press and dropped once it is saved. */
  const operation = useRef<{ id: string; now: Date } | undefined>(undefined);
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const patch = (change: Partial<QuickForm>) => {
    setDraft((d) => ({ ...d, ...change }));
    setError('');
  };
  const client = clients.find((c) => c.id === draft.clientId);
  const quantity = calculateQuickQuantity(draft.quantity, draft.unitPrice);
  const amountValue =
    draft.mode === 'quantity' ? quantity.amount : parseAmount(draft.amount);
  const categoryLabel = getExpenseCategoryLabel(draft.category);
  const preview =
    remaining === null ? null : previewCustody(remaining, amountValue);
  const locked = phase === 'saving';
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
    !!client &&
    amountValue > 0 &&
    amountValue <= 999999999 &&
    validDate &&
    (draft.mode !== 'quantity' || !quantity.error);

  const complete = (expense: Expense) => {
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
    navigator.vibrate?.(12);
  };

  const save = async () => {
    if (!canSave || busy.current) return;
    if (!access.can('expenses.create') || (!ownerIsMe && !canPickPerson)) {
      setError('لا تملك صلاحية تسجيل هذا المصروف');
      return;
    }
    const entry = (operation.current ??= { id: crypto.randomUUID(), now: new Date() });
    const expense = buildQuickExpense({
      id: entry.id,
      now: entry.now,
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
    busy.current = true;
    setPhase('saving');
    setError('');
    try {
      await addExpense(expense);
      complete(expense);
    } catch (cause) {
      if (mounted.current) {
        setError(formatFirebaseError(cause));
        setPhase('form');
      }
    } finally {
      busy.current = false;
    }
  };
  const another = () => {
    operation.current = undefined;
    setDraft((d) => ({
      ...d,
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
            <Button
              block
              loading={phase === 'saving'}
              disabled={!canSave}
              onClick={() => void save()}
            >
              تسجيل المصروف
            </Button>
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
          {duplicate && (
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
