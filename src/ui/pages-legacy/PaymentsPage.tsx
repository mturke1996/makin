import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Add, Payments as PaymentsIcon, Receipt, Search } from '../../design-system/icons';
import { useDataSlice } from '../../stores/useDataStore';
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
  StatCard,
  Input,
  PageHeader,
  PageShell,
  Segmented,
  Select,
} from '../../design-system/primitives';
import type { Payment } from '../../types';
import { PAYMENT_METHOD_LABEL, PaymentFormSheet, type PaymentFormData, type PaymentMethod } from './money/PaymentFormSheet';
import { ConfirmDeleteModal, ListSkeleton, MoneyRow, StickyGroup } from './money/moneyUi';
import { CategoryBreakdown, type CategoryTotal } from './money/CategoryBreakdown';
import { MoneyKpiGrid, MoneyKpiSkeleton, paymentCount } from './money/moneyKpis';
import { summarizePayments } from './money/moneyTrend';
import { DeltaBadge, MiniBars, Sparkline } from '../../design-system/charts';
import { ReceiptPanel } from './money/ReceiptPanel';
import { useReceipt } from './money/useReceipt';
import { groupBy, limitGroups, matchesQuery, monthKey, monthLabel, sumAmounts } from './money/moneyUtils';
import { ShowMoreRows } from './money/ShowMoreRows';
import { useVisibleCount } from './client-profile/activity/useVisibleCount';

type MethodFilter = 'all' | PaymentMethod;

export const PaymentsPage = () => {
  const { payments, clients, invoices, isLoading, addPayment, updatePayment, deletePayment } = useDataSlice('payments', 'clients', 'invoices', 'isLoading', 'addPayment', 'updatePayment', 'deletePayment');
  const { user } = useAuthStore();
  const access = useAccess();
  const receipt = useReceipt();
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

  // The box answers every keystroke at once; the long list catches up when the device has a moment.
  const deferredSearch = useDeferredValue(search);
  /** search + client filter (the method chips count against this set). */
  const scoped = useMemo(
    () =>
      sorted.filter(
        (p) =>
          (!clientId || p.clientId === clientId) &&
          matchesQuery(deferredSearch, p.notes, nameOf(p), invoiceById.get(p.invoiceId)?.invoiceNumber)
      ),
    [sorted, clientId, deferredSearch, nameOf, invoiceById]
  );
  const visible = useMemo(() => scoped.filter((p) => method === 'all' || p.paymentMethod === method), [scoped, method]);
  const { count: rowLimit, showMore, pageSize } = useVisibleCount(`${deferredSearch}|${clientId}|${method}`);
  const allGroups = useMemo(() => groupBy(visible, (p) => monthKey(p.paymentDate)), [visible]);
  const { groups, hidden } = useMemo(() => limitGroups(allGroups, rowLimit), [allGroups, rowLimit]);
  const monthTotals = useMemo(() => new Map(allGroups.map((g) => [g.key, { count: g.items.length, sum: sumAmounts(g.items.map((p) => p.amount)) }])), [allGroups]);

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

  const summary = useMemo(() => summarizePayments(payments), [payments]);
  const { trend } = summary;
  const last = summary.last;
  const months = trend.flow.months.length;

  // Where the money came in by, as the expenses page shows where it went: ranked, with shares that add up to 100.
  const methodTotals = useMemo<CategoryTotal[]>(() => {
    const totals = new Map<string, { amounts: number[] }>();
    for (const p of payments) {
      const cur = totals.get(p.paymentMethod) || { amounts: [] };
      cur.amounts.push(p.amount);
      totals.set(p.paymentMethod, cur);
    }
    return [...totals.entries()]
      .map(([key, v]) => ({ key, label: PAYMENT_METHOD_LABEL[key as PaymentMethod] || key, value: sumAmounts(v.amounts), count: v.amounts.length }))
      .sort((a, b) => b.value - a.value);
  }, [payments]);

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
          <MoneyKpiSkeleton />
          <ListSkeleton />
        </>
      ) : (
        <>
          {payments.length > 0 && (
          <MoneyKpiGrid count={4} label="مؤشرات المدفوعات">
            <StatCard
              label="المحصّل هذا الشهر"
              value={<Amount amount={summary.month.amount} tone="success" />}
              badge={<DeltaBadge pct={trend.collected.changePct !== null && Math.abs(trend.collected.changePct) >= 1000 ? null : trend.collected.changePct} favorable="up" />}
              hint={summary.month.count > 0 ? paymentCount(summary.month.count) : 'لا دفعات هذا الشهر'}
              trend={<Sparkline values={trend.flow.collected} tone="income" height={44} label={`المحصّل الشهري خلال آخر ${months} أشهر`} />}
            />
            <StatCard
              label="إجمالي المحصّل"
              value={<Amount amount={summary.total} />}
              hint={paymentCount(summary.count)}
              trend={<Sparkline values={trend.flow.cumulativeCollected} tone="net" height={44} label={`إجمالي المحصّل التراكمي خلال آخر ${months} أشهر`} />}
            />
            <StatCard
              label="متوسط الدفعة"
              value={<Amount amount={summary.average} />}
              hint={<>أكبر دفعة <Amount amount={summary.largest} className="font-medium text-fg-subtle" /></>}
              trend={summary.recent.length > 1 ? <MiniBars values={summary.recent} tone="income" height={44} groupSize={4} label="مبالغ آخر الدفعات" /> : undefined}
            />
            <StatCard
              label="آخر دفعة"
              value={last ? <span className="tabular-nums"><bdi dir="ltr">{formatDate(last.paymentDate)}</bdi></span> : <span className="text-base font-medium text-fg-muted">لا دفعات</span>}
              hint={last ? <>{nameOf(last)} · <Amount amount={last.amount} className="font-medium text-fg-subtle" /></> : undefined}
              onClick={last && canEdit ? () => openEdit(last) : undefined}
            />
          </MoneyKpiGrid>
          )}

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
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
              <aside className="min-w-0 lg:sticky lg:top-6 lg:order-2">
                <CategoryBreakdown
                  data={methodTotals}
                  total={summary.total}
                  active={method}
                  onSelect={(key) => setMethod(key as MethodFilter)}
                  wording={{ region: 'المدفوعات حسب طريقة الدفع', title: 'حسب طريقة الدفع', count: (n) => (n === 1 ? 'طريقة واحدة' : n === 2 ? 'طريقتان' : n <= 10 ? `${n} طرق` : `${n} طريقة`), all: (n) => `عرض كل الطرق (${n})` }}
                />
              </aside>
              <div className="min-w-0 space-y-5 lg:order-1">
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
                          {monthTotals.get(g.key)!.count} {monthTotals.get(g.key)!.count === 1 ? 'دفعة' : 'دفعات'} · {formatCurrencyDisplay(monthTotals.get(g.key)!.sum)}
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
                            desktopActions={
                              (p.receiptNumber || receipt.canIssue) && (
                                <button
                                  type="button"
                                  onClick={() => void receipt.issue(p, 'download')}
                                  disabled={receipt.busyId === p.id}
                                  aria-label={`إيصال دفعة ${name}`}
                                  title={p.receiptNumber ? `إيصال ${p.receiptNumber}` : 'إصدار إيصال'}
                                  className="inline-flex h-11 w-11 items-center justify-center rounded-md text-fg-subtle transition-colors duration-fast ease-out hover:bg-surface-hover hover:text-fg focus:outline-none focus-visible:shadow-focus disabled:opacity-50"
                                >
                                  <Receipt sx={{ fontSize: 20 }} />
                                </button>
                              )
                            }
                            editLabel={`تعديل دفعة ${name}`}
                            deleteLabel={`حذف دفعة ${name}`}
                          />
                        );
                      })}
                    </StickyGroup>
                  ))}
                  <ShowMoreRows hidden={hidden} pageSize={pageSize} noun="دفعة" onMore={showMore} />
                </div>
              )}
              </div>
            </div>
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
          receiptPanel={
            sheet.edit && (
              <ReceiptPanel
                payment={receipt.live(sheet.edit)}
                busy={receipt.busyId === sheet.edit.id}
                canIssue={receipt.canIssue}
                onDownload={() => void receipt.issue(sheet.edit!, 'download')}
                onShare={() => void receipt.issue(sheet.edit!, 'share')}
              />
            )
          }
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
