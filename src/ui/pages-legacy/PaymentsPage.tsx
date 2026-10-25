import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Add, Payments as PaymentsIcon, Search } from '../../design-system/icons';
import { useDataStore } from '../../stores/useDataStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { clearField } from '../../services/firebaseService';
import { useAccess } from '../../core/access/useAccess';
import { formatCurrencyDisplay, formatDate } from '../../core/utils-formatters';
import {
  Amount,
  Avatar,
  Badge,
  Button,
  EmptyState,
  FigureStrip,
  Input,
  PageHeader,
  PageShell,
  Segmented,
  Select,
} from '../../design-system/primitives';
import type { Payment } from '../../types';
import { PAYMENT_METHOD_LABEL, PaymentFormSheet, type PaymentFormData, type PaymentMethod } from './money/PaymentFormSheet';
import { ConfirmDeleteModal, FigureStripSkeleton, ListSkeleton, MoneyRow, StickyGroup } from './money/moneyUi';
import { groupBy, isSameMonthAsToday, matchesQuery, monthKey, monthLabel, sumAmounts } from './money/moneyUtils';

type MethodFilter = 'all' | PaymentMethod;

export const PaymentsPage = () => {
  const { payments, clients, invoices, isLoading, addPayment, updatePayment, deletePayment } = useDataStore();
  const { user } = useAuthStore();
  const access = useAccess();
  const canEdit = access.can('payments.manage');
  const canRemove = access.can('payments.delete');
  // A payment is recorded against a client (and optionally one of their invoices), so adding one needs the clients list.
  const canSeeClients = access.can('clients.view');
  const canAdd = canEdit && canSeeClients;

  const [search, setSearch] = useState('');
  const [method, setMethod] = useState<MethodFilter>('all');
  const [clientId, setClientId] = useState('');
  const [sheet, setSheet] = useState<{ open: boolean; edit: Payment | null }>({ open: false, edit: null });

  // Home quick actions link here with ?new=1: open the add sheet once, then clear the param.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get('new') !== '1') return;
    if (canAdd) setSheet({ open: true, edit: null });
    const next = new URLSearchParams(searchParams);
    next.delete('new');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, canAdd]);
  const [pendingDelete, setPendingDelete] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const invoiceById = useMemo(() => new Map(invoices.map((i) => [i.id, i])), [invoices]);

  // Without the clients list a payment cannot be tied to a name, and saying "unknown client" would be wrong.
  const nameOf = useCallback(
    (p: Payment) =>
      clientById.get(p.clientId)?.name || invoiceById.get(p.invoiceId)?.tempClientName || (canSeeClients ? 'عميل غير معروف' : 'دفعة'),
    [clientById, invoiceById, canSeeClients]
  );

  const sorted = useMemo(
    () =>
      [...payments].sort(
        (a, b) =>
          new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime() ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [payments]
  );

  /** search + client filter (the method chips count against this set). */
  const scoped = useMemo(
    () =>
      sorted.filter(
        (p) =>
          (!clientId || p.clientId === clientId) &&
          matchesQuery(search, p.notes, nameOf(p), invoiceById.get(p.invoiceId)?.invoiceNumber)
      ),
    [sorted, clientId, search, nameOf, invoiceById]
  );
  const visible = useMemo(() => scoped.filter((p) => method === 'all' || p.paymentMethod === method), [scoped, method]);
  const groups = useMemo(() => groupBy(visible, (p) => monthKey(p.paymentDate)), [visible]);

  const methodOptions = useMemo(() => {
    const present = new Set(payments.map((p) => p.paymentMethod));
    const keys = (['cash', 'check', 'bank_transfer', 'mobile_payment', 'credit_card'] as PaymentMethod[]).filter(
      (k) => k !== 'credit_card' || present.has(k)
    );
    return [
      { value: 'all' as MethodFilter, label: 'الكل', count: scoped.length },
      ...keys.map((k) => ({
        value: k as MethodFilter,
        label: PAYMENT_METHOD_LABEL[k],
        count: scoped.filter((p) => p.paymentMethod === k).length,
      })),
    ];
  }, [payments, scoped]);

  const total = useMemo(() => sumAmounts(payments.map((p) => p.amount)), [payments]);
  const thisMonth = useMemo(
    () => sumAmounts(payments.filter((p) => isSameMonthAsToday(p.paymentDate)).map((p) => p.amount)),
    [payments]
  );
  const last = sorted[0];

  const openAdd = () => setSheet({ open: true, edit: null });
  const openEdit = (p: Payment) => setSheet({ open: true, edit: p });
  const closeSheet = () => setSheet((s) => ({ ...s, open: false }));

  const handleSubmit = async (data: PaymentFormData) => {
    if (sheet.edit) {
      await updatePayment(sheet.edit.id, {
        clientId: data.clientId || sheet.edit.clientId,
        invoiceId: data.invoiceId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        paymentDate: data.paymentDate,
        notes: data.notes || clearField(),
      });
    } else {
      const now = new Date().toISOString();
      await addPayment({
        id: crypto.randomUUID(),
        invoiceId: data.invoiceId,
        clientId: data.clientId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        paymentDate: data.paymentDate,
        notes: data.notes,
        createdAt: now,
        updatedAt: now,
        createdBy: user?.displayName || 'المستخدم',
      });
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deletePayment(pendingDelete.id);
      setPendingDelete(null);
      closeSheet();
    } catch {
      /* toasted by the store */
    } finally {
      setDeleting(false);
    }
  };

  const filtering = !!search.trim() || !!clientId || method !== 'all';
  const resetFilters = () => {
    setSearch('');
    setClientId('');
    setMethod('all');
  };

  return (
    <PageShell>
      <PageHeader
        title="المدفوعات"
        subtitle="ما استلمته من العملاء، مرتباً بالأحدث"
        actions={
          canAdd ? (
            <Button leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={openAdd}>
              دفعة جديدة
            </Button>
          ) : undefined
        }
      />

      {isLoading && payments.length === 0 ? (
        <>
          <FigureStripSkeleton />
          <ListSkeleton />
        </>
      ) : (
        <>
          <FigureStrip
            figures={[
              { label: 'المحصّل هذا الشهر', value: <Amount amount={thisMonth} tone="success" />, tone: 'success' },
              { label: 'إجمالي المحصّل', value: <Amount amount={total} /> },
              { label: 'عدد الدفعات', value: payments.length },
              {
                label: 'آخر دفعة',
                value: last ? formatDate(last.paymentDate) : '-',
                hint: last ? nameOf(last) : undefined,
              },
            ]}
          />

          {payments.length === 0 ? (
            <EmptyState
              Icon={PaymentsIcon}
              title="لا توجد مدفوعات بعد"
              description="كل دفعة تستلمها من عميل تظهر هنا مجمّعة حسب الشهر، وتُخصم من فاتورته تلقائياً."
              action={
                canAdd ? (
                  <Button leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={openAdd}>
                    أضف أول دفعة
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="space-y-3">
                <div className={canSeeClients ? 'grid gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]' : 'grid gap-3'}>
                  <Input
                    leftIcon={<Search sx={{ fontSize: 20 }} />}
                    placeholder="بحث بالعميل أو الملاحظة أو رقم الفاتورة"
                    aria-label="بحث في المدفوعات"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {canSeeClients && (
                    <Select aria-label="تصفية حسب العميل" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                      <option value="">كل العملاء</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
                <Segmented<MethodFilter>
                  layout="scroll"
                  aria-label="طريقة الدفع"
                  options={methodOptions}
                  value={method}
                  onChange={setMethod}
                />
              </div>

              {visible.length === 0 ? (
                <EmptyState
                  Icon={Search}
                  title="لا نتائج مطابقة"
                  description="غيّر كلمة البحث أو أزل التصفية لرؤية كل المدفوعات."
                  action={
                    filtering ? (
                      <Button variant="outline" onClick={resetFilters}>
                        إزالة التصفية
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="space-y-1">
                  {groups.map((g) => (
                    <StickyGroup
                      key={g.key}
                      title={monthLabel(g.items[0].paymentDate)}
                      trailing={
                        <span>
                          {g.items.length} {g.items.length === 1 ? 'دفعة' : 'دفعات'} · {formatCurrencyDisplay(sumAmounts(g.items.map((p) => p.amount)))}
                        </span>
                      }
                    >
                      {g.items.map((p) => {
                        const name = nameOf(p);
                        const inv = invoiceById.get(p.invoiceId);
                        return (
                          <MoneyRow
                            key={p.id}
                            leading={<Avatar name={name} />}
                            title={name}
                            subtitle={formatDate(p.paymentDate)}
                            note={p.notes || undefined}
                            meta={
                              <>
                                <Badge>{PAYMENT_METHOD_LABEL[p.paymentMethod] || p.paymentMethod}</Badge>
                                {inv?.invoiceNumber && <span className="text-xs text-fg-muted">فاتورة {inv.invoiceNumber}</span>}
                              </>
                            }
                            trailing={<Amount amount={p.amount} tone="success" showSign className="text-md font-bold" />}
                            onOpen={canEdit ? () => openEdit(p) : undefined}
                            onDelete={canRemove ? () => setPendingDelete(p) : undefined}
                            editLabel={`تعديل دفعة ${name}`}
                            deleteLabel={`حذف دفعة ${name}`}
                          />
                        );
                      })}
                    </StickyGroup>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {canEdit && (
        <PaymentFormSheet
          open={sheet.open}
          edit={sheet.edit}
          clients={clients}
          invoices={invoices}
          payments={payments}
          onClose={closeSheet}
          onSubmit={handleSubmit}
          onDelete={canRemove ? (p) => setPendingDelete(p) : undefined}
        />
      )}

      <ConfirmDeleteModal
        open={!!pendingDelete}
        title="حذف هذه الدفعة؟"
        description={
          pendingDelete
            ? `سيُحذف مبلغ ${formatCurrencyDisplay(pendingDelete.amount)} المسجّل باسم ${nameOf(pendingDelete)} بتاريخ ${formatDate(pendingDelete.paymentDate)}، وتُعاد حالة الفاتورة المرتبطة. لا يمكن التراجع.`
            : ''
        }
        confirmLabel="حذف الدفعة"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </PageShell>
  );
};
