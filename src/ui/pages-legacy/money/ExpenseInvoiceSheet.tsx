import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Receipt } from '../../../design-system/icons';
import {
  Amount,
  Button,
  cn,
  EmptyState,
  Input,
  ListGroup,
  Select,
  Sheet,
  Textarea,
} from '../../../design-system/primitives';
import { formatDate, getExpenseCategoryLabel } from '../../../core/utils-formatters';
import type { Client, Expense } from '../../../types';
import { FormBody, FormSection } from './moneyUi';
import { sumAmounts } from './moneyUtils';

export interface ExpenseInvoiceInput {
  clientId: string;
  expenseIds: string[];
  invoiceNumber: string;
  notes?: string;
}

interface Props {
  open: boolean;
  clients: Client[];
  /** Every expense the person may list (creating an invoice needs `expenses.edit.all`, which includes seeing all). */
  expenses: Expense[];
  onClose: () => void;
  onCreate: (input: ExpenseInvoiceInput) => Promise<void>;
}

const newNumber = () => `EXP-${dayjs().locale('en').format('YYMMDD-HHmm')}`;

/** Pick a client, tick the open expenses to bundle, name the invoice. Total bar stays pinned. */
export function ExpenseInvoiceSheet({ open, clients, expenses, onClose, onCreate }: Props) {
  const [clientId, setClientId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(newNumber);
  const [notes, setNotes] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);

  const firstClientId = clients[0]?.id || '';
  useEffect(() => {
    if (!open) return;
    setClientId(firstClientId);
    setInvoiceNumber(newNumber());
    setNotes('');
    setSelected(new Set());
    setAttempted(false);
    setSaving(false);
  }, [open, firstClientId]);

  const openExpenses = useMemo(() => {
    if (!clientId) return [];
    return expenses
      .filter((e) => e.clientId === clientId && !e.isClosed)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, clientId]);

  const total = useMemo(
    () => sumAmounts(openExpenses.filter((e) => selected.has(e.id)).map((e) => e.amount)),
    [openExpenses, selected]
  );
  const count = openExpenses.filter((e) => selected.has(e.id)).length;
  const allSelected = openExpenses.length > 0 && count === openExpenses.length;

  const allRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = count > 0 && !allSelected;
  }, [count, allSelected]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(openExpenses.map((e) => e.id)));

  const submit = async () => {
    setAttempted(true);
    if (!clientId || count === 0 || !invoiceNumber.trim()) return;
    setSaving(true);
    try {
      await onCreate({
        clientId,
        expenseIds: openExpenses.filter((e) => selected.has(e.id)).map((e) => e.id),
        invoiceNumber: invoiceNumber.trim(),
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch {
      /* toasted by the store; selection is kept */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="فاتورة مصروفات جديدة"
      subtitle="اختر المصروفات المفتوحة لمشروع وأغلقها في فاتورة واحدة"
      maxWidth="md"
      footer={
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-fg-subtle">
              {count > 0 ? `الإجمالي · ${count} ${count === 1 ? 'مصروف' : 'مصروفات'}` : 'الإجمالي'}
            </span>
            <Amount amount={total} tone={count > 0 ? 'danger' : 'neutral'} className="text-xl font-bold" />
          </div>
          <Button block loading={saving} disabled={count === 0} onClick={submit}>
            إنشاء الفاتورة وإغلاق المصروفات
          </Button>
        </div>
      }
    >
      <FormBody>
        <FormSection title="العميل أو المشروع">
          <Select
            label="العميل"
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setSelected(new Set());
            }}
          >
            <option value="">اختر العميل</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FormSection>

        <FormSection
          title="المصروفات المفتوحة"
          hint={clientId ? 'المصروفات غير المغلقة في أي فاتورة سابقة' : undefined}
        >
          {!clientId ? (
            <p className="rounded-md bg-surface-sunken px-3.5 py-3 text-sm text-fg-subtle">اختر العميل لعرض مصروفاته المفتوحة.</p>
          ) : openExpenses.length === 0 ? (
            <EmptyState bare Icon={Receipt} title="لا توجد مصروفات مفتوحة" description="كل مصروفات هذا العميل مغلقة في فواتير سابقة، أو لم تُسجَّل بعد." />
          ) : (
            <ListGroup>
              <label className="flex min-h-14 cursor-pointer items-center gap-3 bg-surface-sunken px-3.5 py-2.5">
                <input
                  ref={allRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-5 w-5 flex-none cursor-pointer accent-[color:var(--accent)]"
                />
                <span className="flex-1 text-base font-semibold text-fg">تحديد الكل</span>
                <span className="text-xs text-fg-muted">
                  {count} من {openExpenses.length}
                </span>
              </label>
              {openExpenses.map((e) => {
                const on = selected.has(e.id);
                return (
                  <label
                    key={e.id}
                    className={cn(
                      'flex min-h-16 cursor-pointer items-center gap-3 px-3.5 py-2.5 transition-colors duration-fast ease-out',
                      on ? 'bg-accent-soft' : 'hover:bg-surface-hover'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(e.id)}
                      className="h-5 w-5 flex-none cursor-pointer accent-[color:var(--accent)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-base font-medium leading-snug text-fg">{e.description}</span>
                      <span className="mt-0.5 block truncate text-xs text-fg-muted">
                        {formatDate(e.date)} · {getExpenseCategoryLabel(e.category)}
                      </span>
                    </span>
                    <Amount amount={e.amount} tone="danger" className="flex-none text-md font-semibold" />
                  </label>
                );
              })}
            </ListGroup>
          )}
          {attempted && clientId && openExpenses.length > 0 && count === 0 && (
            <p role="alert" className="text-xs text-danger-ink">
              حدد مصروفاً واحداً على الأقل
            </p>
          )}
        </FormSection>

        <FormSection title="بيانات الفاتورة">
          <Input
            label="رقم الفاتورة"
            autoComplete="off"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            error={attempted && !invoiceNumber.trim() ? 'أدخل رقم الفاتورة' : undefined}
          />
          <Textarea label="ملاحظات" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <p className="text-xs leading-relaxed text-fg-muted">
            تُغلق المصروفات المحددة داخل الفاتورة، ويمكن إعادة فتحها بحذف الفاتورة.
          </p>
        </FormSection>
      </FormBody>
    </Sheet>
  );
}
