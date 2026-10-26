import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Add, ArrowBack, Receipt } from '../../design-system/icons';
import { useDataSlice } from '../../stores/useDataStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAccess } from '../../core/access/useAccess';
import { formatCurrencyDisplay, formatDate } from '../../core/utils-formatters';
import {
  Amount,
  Avatar,
  Badge,
  Button,
  EmptyState,
  FigureStrip,
  ListGroup,
  PageHeader,
  PageShell,
} from '../../design-system/primitives';
import type { ExpenseInvoice } from '../../types';
import { ExpenseInvoiceDetailSheet } from './money/ExpenseInvoiceDetailSheet';
import { ExpenseInvoiceSheet, type ExpenseInvoiceInput } from './money/ExpenseInvoiceSheet';
import { ConfirmDeleteModal, FigureStripSkeleton, ListSkeleton, MoneyRow } from './money/moneyUi';
import { sumAmounts } from './money/moneyUtils';
import { deny } from '../feedback/deny';

const STATUS: Record<ExpenseInvoice['status'], { label: string; tone: 'success' | 'info' | 'neutral' }> = {
  saved: { label: 'محفوظة', tone: 'success' },
  sent: { label: 'مرسلة', tone: 'info' },
  draft: { label: 'مسودة', tone: 'neutral' },
};

/**
 * Expense invoices bundle other people's expenses, so the page belongs to whoever sees every expense
 * (`canUseExpenseInvoices`), and every figure here is real. Creating or deleting one changes expenses
 * (closing and reopening them), which takes `expenses.edit.all`.
 */
export function ExpenseInvoicesPage() {
  const user = useAuthStore((s) => s.user);
  const access = useAccess();
  const canManage = access.can('expenses.edit.all');
  const { expenseInvoices, expenses, clients, isLoading, createExpenseInvoiceBatch, deleteExpenseInvoice } = useDataSlice('expenseInvoices', 'expenses', 'clients', 'isLoading', 'createExpenseInvoiceBatch', 'deleteExpenseInvoice');

  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<{ open: boolean; invoice: ExpenseInvoice | null }>({ open: false, invoice: null });
  const [pendingDelete, setPendingDelete] = useState<ExpenseInvoice | null>(null);
  const [deleting, setDeleting] = useState(false);

  const clientName = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);
  const listable = useMemo(() => access.listableExpenses(expenses), [access, expenses]);
  const rows = useMemo(
    () =>
      [...expenseInvoices]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((inv) => ({ inv, amount: inv.totalAmount, count: inv.expenseIds?.length || 0 })),
    [expenseInvoices]
  );
  const total = useMemo(() => sumAmounts(rows.map((r) => r.amount)), [rows]);
  const bundled = rows.reduce((n, r) => n + r.count, 0);

  const handleCreate = async (input: ExpenseInvoiceInput) => {
    if (!canManage) deny();
    await createExpenseInvoiceBatch({ ...input, createdBy: user?.displayName || 'المستخدم' });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteExpenseInvoice(pendingDelete.id);
      setPendingDelete(null);
      setDetail((d) => ({ ...d, open: false }));
    } catch {
      /* toasted by the store */
    } finally {
      setDeleting(false);
    }
  };

  const loading = isLoading && expenseInvoices.length === 0;

  return (
    <PageShell>
      <PageHeader
        eyebrow={
          <Link
            to="/expenses"
            className="hidden min-h-11 items-center gap-1 rounded-md text-sm font-medium text-fg-subtle hover:text-fg focus:outline-none focus-visible:shadow-focus lg:inline-flex"
          >
            <ArrowBack aria-hidden sx={{ fontSize: 18 }} className="rtl-flip" />
            المصروفات
          </Link>
        }
        title="فواتير المصروفات"
        subtitle="تجميع مصروفات مشروع وإغلاقها في فاتورة واحدة"
        actions={
          canManage ? (
            <Button leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={() => setCreating(true)}>
              فاتورة جديدة
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <>
          <FigureStripSkeleton />
          <ListSkeleton rows={3} />
        </>
      ) : rows.length === 0 ? (
        <EmptyState
          Icon={Receipt}
          title="لا توجد فواتير مجمعة"
          description={
            canManage
              ? 'اختر مشروعاً، حدد مصروفاته غير المغلقة، وأنشئ منها فاتورة واحدة تُغلق بها المصروفات.'
              : 'لم تُنشأ أي فاتورة مجمعة حتى الآن. تظهر هنا الفواتير التي تغلق بها المصروفات.'
          }
          action={
            canManage ? (
              <Button leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={() => setCreating(true)}>
                أنشئ أول فاتورة
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <FigureStrip
            figures={[
              { label: 'إجمالي الفواتير', value: <Amount amount={total} tone="danger" />, tone: 'danger' },
              { label: 'عدد الفواتير', value: rows.length, hint: `تغلق ${bundled} مصروفاً` },
            ]}
          />
          <ListGroup>
            {rows.map(({ inv, amount, count }) => {
              const name = clientName.get(inv.clientId) || 'عميل غير معروف';
              const status = STATUS[inv.status] || STATUS.saved;
              return (
                <MoneyRow
                  key={inv.id}
                  leading={<Avatar name={name} shape="entity" />}
                  title={`فاتورة ${inv.invoiceNumber}`}
                  subtitle={name}
                  note={`${formatDate(inv.startDate)} إلى ${formatDate(inv.endDate)}`}
                  meta={
                    <>
                      <Badge tone={status.tone} dot>
                        {status.label}
                      </Badge>
                      <span className="text-xs text-fg-muted">{count} مصروف</span>
                    </>
                  }
                  trailing={<Amount amount={amount} tone="danger" className="text-md font-bold" />}
                  onOpen={() => setDetail({ open: true, invoice: inv })}
                  onDelete={canManage ? () => setPendingDelete(inv) : undefined}
                  editLabel={`عرض فاتورة ${inv.invoiceNumber}`}
                  deleteLabel={`حذف فاتورة ${inv.invoiceNumber}`}
                />
              );
            })}
          </ListGroup>
        </>
      )}

      {canManage && (
        <ExpenseInvoiceSheet
          open={creating}
          clients={clients}
          expenses={listable}
          onClose={() => setCreating(false)}
          onCreate={handleCreate}
        />
      )}

      <ExpenseInvoiceDetailSheet
        open={detail.open}
        invoice={detail.invoice}
        clientName={detail.invoice ? clientName.get(detail.invoice.clientId) || 'عميل غير معروف' : ''}
        onClose={() => setDetail((d) => ({ ...d, open: false }))}
        onDelete={canManage ? (inv) => setPendingDelete(inv) : undefined}
      />

      <ConfirmDeleteModal
        open={!!pendingDelete}
        title="حذف فاتورة المصروفات؟"
        description={
          pendingDelete
            ? `ستُحذف الفاتورة ${pendingDelete.invoiceNumber} (${formatCurrencyDisplay(pendingDelete.totalAmount)}) وتُعاد ${pendingDelete.expenseIds.length} مصروفات إلى حالتها المفتوحة. المصروفات نفسها لا تُحذف.`
            : ''
        }
        confirmLabel="حذف الفاتورة"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </PageShell>
  );
}
