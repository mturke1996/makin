import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Add, Check, HourglassEmpty, CancelOutlined, Receipt, Search, TrendingDown } from '../../design-system/icons';
import { useDataSlice } from '../../stores/useDataStore';
import { deny } from '../feedback/deny';
import toast from 'react-hot-toast';
import { EXPENSE_CLOSED_MESSAGE, expenseReadOnlyNotice, isExpenseLocked } from '../../core/finance/expenseLock';
import { approvalCounts, expensePhrase, isAwaitingApproval, matchesApprovalFilter, type ApprovalFilter } from '../../core/finance/expenseApproval';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAccess } from '../../core/access/useAccess';
import {
  buildAuthorRoleIndex,
  countByAuthorRole,
  expenseAuthorRole,
  matchesAuthorFilter,
  type AuthorFilter,
} from '../../core/access/expenseBadge';
import { useMyFundStats } from '../../core/hooks/useMyFundStats';
import { expenseCategories, formatCurrencyDisplay, getExpenseCategoryLabel } from '../../core/utils-formatters';
import {
  Amount,
  Button,
  EmptyState,
  StatCard,
  Input,
  PageHeader,
  PageShell,
  Segmented,
  Select,
  cn,
} from '../../design-system/primitives';
import type { Expense } from '../../types';
import { useUsersDirectory } from './client-profile/useUsersDirectory';
import { CategoryBreakdown, type CategoryTotal } from './money/CategoryBreakdown';
import { ExpenseFormSheet, type ExpenseFormData } from './money/ExpenseFormSheet';
import { ExpenseRow } from './money/ExpenseRow';
import { FundBanner } from './money/FundBanner';
import { ConfirmDeleteModal, ListSkeleton, StickyGroup } from './money/moneyUi';
import { MoneyKpiGrid, MoneyKpiSkeleton } from './money/moneyKpis';
import { summarizeExpenses } from './money/moneyTrend';
import { DeltaBadge, MiniBars, Sparkline } from '../../design-system/charts';
import { ProfileCallout } from './client-profile/profileUi';
import { dayKey, dayLabel, groupBy, limitGroups, matchesQuery, sumAmounts } from './money/moneyUtils';
import { ShowMoreRows } from './money/ShowMoreRows';
import { useVisibleCount } from './client-profile/activity/useVisibleCount';

/**
 * Expenses. What this page lists is decided by the access policy: a field employee sees (and
 * totals) their own expenses and the page says so ("مصروفاتي"); someone with `expenses.view.all`
 * sees everyone's, with who recorded each one taken from the users directory.
 */
export const ExpensesPage = () => {
  const navigate = useNavigate();
  const access = useAccess();
  const { expenses, addExpense, updateExpense, deleteExpense, approveExpenses, rejectExpense, clients, projectPhases, suppliers, isLoading } = useDataSlice('expenses', 'addExpense', 'updateExpense', 'deleteExpense', 'approveExpenses', 'rejectExpense', 'clients', 'projectPhases', 'suppliers', 'isLoading');
  const user = useAuthStore((s) => s.user);
  const myFundStats = useMyFundStats();

  const seesAll = access.expenseScope === 'all';
  const canCreate = access.can('expenses.create');
  // Whoever may edit all expenses decides which ones are approved (the rules say the same).
  const canApprove = access.can('expenses.edit.all');

  // The directory tells admin from employee on each row; only people who see everyone's expenses need it.
  const directory = useUsersDirectory(seesAll && access.canViewDirectory);
  const authorRoles = useMemo(() => buildAuthorRoleIndex(directory), [directory]);
  const showRoles = seesAll && directory.length > 0;

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [authorFilter, setAuthorFilter] = useState<AuthorFilter>('all');
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>(() => {
    const wanted = new URLSearchParams(window.location.search).get('status');
    return wanted === 'pending' || wanted === 'rejected' ? wanted : 'all';
  });
  const [confirmAll, setConfirmAll] = useState(false);
  const [sheet, setSheet] = useState<{ open: boolean; edit: Expense | null }>({ open: false, edit: null });

  const [searchParams, setSearchParams] = useSearchParams();
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Home quick actions link here with ?new=1: open the add sheet once, then clear the param.
  useEffect(() => {
    if (searchParams.get('new') !== '1') return;
    if (canCreate) setSheet({ open: true, edit: null });
    const next = new URLSearchParams(searchParams);
    next.delete('new');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, canCreate]);

  const clientName = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  // The store may also hold worker payments made by others; only what the policy lists belongs here.
  const visibleExpenses = useMemo(() => access.listableExpenses(expenses), [access, expenses]);
  const authorCounts = useMemo(() => countByAuthorRole(visibleExpenses, authorRoles), [visibleExpenses, authorRoles]);
  const review = useMemo(() => approvalCounts(visibleExpenses), [visibleExpenses]);

  const deferredQuery = useDeferredValue(searchQuery);
  const filtered = useMemo(
    () =>
      visibleExpenses
        .filter((e) => {
          const matchCategory = categoryFilter === 'all' || e.category === categoryFilter;
          const matchSearch = matchesQuery(
            deferredQuery,
            e.description,
            e.category,
            getExpenseCategoryLabel(e.category),
            e.createdBy,
            e.invoiceNumber,
            clientName.get(e.clientId)
          );
          const matchAuthor = !showRoles || matchesAuthorFilter(e, authorRoles, authorFilter);
          return matchCategory && matchSearch && matchAuthor && matchesApprovalFilter(e, approvalFilter);
        })
        .sort(
          (a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime() ||
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [visibleExpenses, deferredQuery, categoryFilter, authorFilter, approvalFilter, showRoles, authorRoles, clientName]
  );
  const { count: rowLimit, showMore, pageSize } = useVisibleCount(`${deferredQuery}|${categoryFilter}|${authorFilter}|${approvalFilter}`);
  const allGroups = useMemo(() => groupBy(filtered, (e) => dayKey(e.date)), [filtered]);
  const { groups, hidden } = useMemo(() => limitGroups(allGroups, rowLimit), [allGroups, rowLimit]);
  const dayTotals = useMemo(() => new Map(allGroups.map((g) => [g.key, { count: g.items.length, sum: sumAmounts(g.items.map((e) => e.amount)) }])), [allGroups]);

  const categoryTotals = useMemo<CategoryTotal[]>(() => {
    const totals = new Map<string, { milli: number; count: number }>();
    for (const e of visibleExpenses) {
      const cur = totals.get(e.category) || { milli: 0, count: 0 };
      cur.milli += Math.round(e.amount * 1000);
      cur.count += 1;
      totals.set(e.category, cur);
    }
    return [...totals.entries()]
      .map(([key, v]) => ({ key, label: getExpenseCategoryLabel(key), value: v.milli / 1000, count: v.count }))
      .sort((a, b) => b.value - a.value);
  }, [visibleExpenses]);

  const summary = useMemo(() => summarizeExpenses(visibleExpenses, getExpenseCategoryLabel, isAwaitingApproval), [visibleExpenses]);
  const totalExpenses = summary.total;
  const { trend } = summary;
  const months = trend.flow.months.length;
  const entries = (n: number) => (n === 1 ? 'سجل واحد' : n === 2 ? 'سجلان' : n >= 3 && n <= 10 ? `${n} سجلات` : `${n} سجلاً`);

  // One new expense keeps ONE operation (id and time) for as long as its form is open: pressing «save» again after a slow
  // answer repeats the same operation (the server refuses to record it twice) instead of adding a second expense.
  const operation = useRef<{ id: string; createdAt: string } | undefined>(undefined);
  const openAdd = () => { operation.current = undefined; setSheet({ open: true, edit: null }); };
  // Every row opens: an expense the person may not change (closed, or not theirs) opens read-only with the reason.
  const openExpense = (e: Expense) => setSheet({ open: true, edit: e });
  const askDelete = (e: Expense) => {
    if (!access.canDeleteExpense(e)) {
      if (isExpenseLocked(e)) toast.error(EXPENSE_CLOSED_MESSAGE);
      return;
    }
    setPendingDelete(e);
  };
  const closeSheet = () => { operation.current = undefined; setSheet((s) => ({ ...s, open: false })); };

  const handleSubmit = async (data: ExpenseFormData) => {
    const editing = sheet.edit;
    // The form already offers no way to get here without the right; this keeps a stale screen from writing.
    if (editing ? !access.canEditExpense(editing) : !canCreate) deny();
    if (!editing && !user?.id) {
      toast.error('تعذّر تحديد حسابك، أعد تسجيل الدخول ثم حاول مجدداً');
      throw new Error('no-user');
    }
    // The id AND the creation time belong to the operation: a repeat must carry exactly what the first one did.
    if (!editing) operation.current ??= { id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    const expenseId = editing?.id || operation.current!.id;
    // quantity x price is optional; zeros clear a line that existed before
    const qtyFields =
      data.quantity != null
        ? { quantity: data.quantity, unitPrice: data.unitPrice, unit: data.unit }
        : data.clearQuantity
          ? { quantity: 0, unitPrice: 0, unit: '' }
          : {};
    // The supplier's name is copied onto the expense so it still reads for someone who cannot open the directory.
    const supplier = data.supplierId ? suppliers.find((s) => s.id === data.supplierId) : undefined;
    const cleared = null as unknown as undefined;
    const payload = {
      description: data.description,
      amount: data.amount,
      category: data.category as Expense['category'],
      date: data.date,
      ...(data.invoiceNumber ? { invoiceNumber: data.invoiceNumber } : {}),
      notes: data.notes,
      clientId: data.clientId,
      // A removed phase is cleared with null on an edit; on a new expense there is simply none.
      ...(data.phaseId ? { phaseId: data.phaseId } : editing?.phaseId ? { phaseId: null as unknown as undefined } : {}),
      ...qtyFields,
      ...(supplier ? { supplierId: supplier.id, supplierName: supplier.name } : editing?.supplierId ? { supplierId: cleared, supplierName: cleared } : {}),
      updatedAt: new Date().toISOString(),
    };
    if (editing) {
      // The owner (`userId`) is set once, at creation: the rules refuse a change of owner.
      await updateExpense(editing.id, payload);
    } else {
      await addExpense({
        id: expenseId,
        ...payload,
        isClosed: false,
        createdAt: operation.current!.createdAt,
        userId: user!.id,
        createdBy: user?.displayName || 'غير معروف',
      });
      operation.current = undefined;
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteExpense(pendingDelete.id);
      setPendingDelete(null);
      closeSheet();
    } catch {
      /* toasted by the store */
    } finally {
      setDeleting(false);
    }
  };

  const filtering = !!searchQuery.trim() || categoryFilter !== 'all' || (showRoles && authorFilter !== 'all') || approvalFilter !== 'all';
  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setAuthorFilter('all');
    setApprovalFilter('all');
  };

  const waitingToApprove = useMemo(() => filtered.filter((e) => isAwaitingApproval(e) && !isExpenseLocked(e)), [filtered]);
  // Who is being approved right now: their button waits and says so, and a second press cannot repeat it.
  const [approving, setApproving] = useState<ReadonlySet<string>>(() => new Set());
  const approveOne = async (id: string) => {
    if (approving.has(id)) return;
    setApproving((s) => new Set(s).add(id));
    try {
      await approveExpenses([id]);
    } catch {
      /* the store already told the person why */
    } finally {
      setApproving((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  };
  const approveAllShown = async () => {
    try {
      await approveExpenses(waitingToApprove.map((e) => e.id));
    } catch {
      /* the store already told the person why */
    } finally {
      setConfirmAll(false);
    }
  };

  const authorOptions = [
    { value: 'all' as AuthorFilter, label: 'الكل', count: authorCounts.all },
    { value: 'employee' as AuthorFilter, label: 'مصروفات الموظفين', count: authorCounts.employee },
    { value: 'admin' as AuthorFilter, label: 'مصروفات الإدارة', count: authorCounts.admin },
  ];

  // The status filter appears only when something is waiting or was sent back.
  const hasReview = review.pending > 0 || review.rejected > 0 || approvalFilter !== 'all';
  const statusOptions = [
    { value: 'all' as ApprovalFilter, label: 'كل الحالات', count: visibleExpenses.length },
    { value: 'pending' as ApprovalFilter, label: 'بانتظار الاعتماد', count: review.pending },
    { value: 'rejected' as ApprovalFilter, label: 'مرفوضة', count: review.rejected },
  ];

  const loading = isLoading && expenses.length === 0;
  const editNotice = sheet.edit ? expenseReadOnlyNotice(sheet.edit, access.canEditExpense(sheet.edit)) : null;

  return (
    <PageShell>
      <PageHeader
        title={seesAll ? 'المصروفات' : 'مصروفاتي'}
        subtitle={seesAll ? 'ما صُرف على المشاريع، ومن سجّله' : 'ما سجّلته أنت من مصروفات على المشاريع'}
        actions={
          <>
            {access.canUseExpenseInvoices && (
              <Button
                variant="outline"
                aria-label="فواتير المصروفات المجمعة"
                title="فواتير المصروفات المجمعة"
                leftIcon={<Receipt sx={{ fontSize: 20 }} />}
                onClick={() => navigate('/expenses/invoices')}
              >
                <span className="hidden sm:inline">فواتير مجمعة</span>
              </Button>
            )}
            {canCreate && (
              <Button leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={openAdd}>
                مصروف جديد
              </Button>
            )}
          </>
        }
      />

      {access.custodyScope !== 'none' && myFundStats && <FundBanner stats={myFundStats} />}

      {loading ? (
        <>
          <MoneyKpiSkeleton />
          <ListSkeleton />
        </>
      ) : visibleExpenses.length === 0 && !filtering ? (
        <EmptyState
          Icon={TrendingDown}
          title="لا توجد مصروفات بعد"
          description={
            canCreate
              ? 'سجّل كل مصروف على مشروعه مع التصنيف والمرفق، وتظهر هنا مجمّعة حسب اليوم.'
              : 'لم يُسجَّل أي مصروف حتى الآن. تظهر المصروفات هنا مجمّعة حسب اليوم.'
          }
          action={
            canCreate ? (
              <Button leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={openAdd}>
                سجّل أول مصروف
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <MoneyKpiGrid count={4} label="مؤشرات المصروفات">
            <StatCard
              label={seesAll ? 'إجمالي المصروفات' : 'إجمالي مصروفاتي'}
              value={<Amount amount={totalExpenses} tone="danger" />}
              hint={entries(summary.count)}
              trend={<Sparkline values={trend.flow.cumulativeExpenses} tone="expense" height={44} label={`إجمالي المصروفات التراكمي خلال آخر ${months} أشهر`} />}
            />
            <StatCard
              label="هذا الشهر"
              value={<Amount amount={summary.month.amount} />}
              badge={<DeltaBadge pct={trend.expenses.changePct !== null && Math.abs(trend.expenses.changePct) >= 1000 ? null : trend.expenses.changePct} favorable="down" />}
              hint={summary.month.count > 0 ? entries(summary.month.count) : 'لا مصروفات هذا الشهر'}
              trend={<Sparkline values={trend.flow.expenses} tone="expense" height={44} label={`المصروفات الشهرية خلال آخر ${months} أشهر`} />}
            />
            {/* Someone who approves already has the «بانتظار اعتمادك» banner below; this card is for the one waiting to be approved. */}
            {summary.pending.count > 0 && !canApprove ? (
              <StatCard
                label="بانتظار الاعتماد"
                value={<Amount amount={summary.pending.amount} tone="warning" />}
                hint={`${expensePhrase(summary.pending.count)}، اضغط للعرض`}
                onClick={() => { setApprovalFilter('pending'); setConfirmAll(false); }}
              />
            ) : (
              <StatCard
                label="متوسط السجل"
                value={<Amount amount={summary.average} />}
                hint={`من ${entries(summary.count)}`}
                trend={summary.recent.length > 1 ? <MiniBars values={summary.recent} tone="expense" height={44} groupSize={4} label="مبالغ آخر المصروفات" /> : undefined}
              />
            )}
            <StatCard
              label="أكبر تصنيف"
              value={summary.top ? <span className="block whitespace-normal text-lg leading-7">{summary.top.label}</span> : <span className="text-base font-medium text-fg-muted">لا تصنيفات</span>}
              hint={summary.top ? <><bdi dir="ltr">{summary.top.share < 1 ? '<1' : summary.top.share}%</bdi> من الإجمالي · <Amount amount={summary.top.amount} className="font-medium text-fg-subtle" /></> : undefined}
              onClick={summary.top ? () => setCategoryFilter(categoryFilter === summary.top!.key ? 'all' : summary.top!.key) : undefined}
            />
          </MoneyKpiGrid>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
            <aside className="min-w-0 lg:sticky lg:top-6 lg:order-2">
              <CategoryBreakdown
                data={categoryTotals}
                total={totalExpenses}
                active={categoryFilter}
                onSelect={setCategoryFilter}
              />
            </aside>

            <div className="min-w-0 space-y-5 lg:order-1">
              <div className="space-y-3">
                {canApprove && review.pending > 0 && approvalFilter !== 'pending' && (
                  <ProfileCallout
                    tone="warning"
                    icon={<HourglassEmpty sx={{ fontSize: 22 }} />}
                    title={`${expensePhrase(review.pending)} بانتظار اعتمادك`}
                    figure={<Amount amount={review.pendingAmount} />}
                    figureLabel="القيمة"
                    action={<Button size="sm" variant="outline" onClick={() => setApprovalFilter('pending')}>مراجعة</Button>}
                  />
                )}
                {!canApprove && review.rejected > 0 && approvalFilter !== 'rejected' && (
                  <ProfileCallout
                    tone="danger"
                    icon={<CancelOutlined sx={{ fontSize: 22 }} />}
                    title={`${expensePhrase(review.rejected, { one: 'مرفوض', two: 'مرفوضان', few: 'مرفوضة', many: 'مرفوضاً' })} يحتاج تصحيحك`}
                    action={<Button size="sm" variant="outline" onClick={() => setApprovalFilter('rejected')}>عرض</Button>}
                  />
                )}
                {canApprove && approvalFilter === 'pending' && waitingToApprove.length > 0 && (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-panel px-3.5 py-2.5">
                    <p className="text-sm text-fg-muted">
                      {confirmAll ? `سيُعتمد ${waitingToApprove.length} مصروفاً بقيمة ${formatCurrencyDisplay(sumAmounts(waitingToApprove.map((e) => e.amount)))}` : 'راجع كل مصروف، أو اعتمد ما أمامك دفعة واحدة'}
                    </p>
                    <Button
                      size="sm"
                      variant={confirmAll ? 'primary' : 'outline'}
                      leftIcon={<Check sx={{ fontSize: 18 }} />}
                      onClick={() => (confirmAll ? void approveAllShown() : setConfirmAll(true))}
                    >
                      {confirmAll ? 'تأكيد الاعتماد' : `اعتماد الكل (${waitingToApprove.length})`}
                    </Button>
                  </div>
                )}
                {showRoles && (
                  <Segmented<AuthorFilter>
                    layout="scroll"
                    aria-label="مصدر المصروف"
                    options={authorOptions}
                    value={authorFilter}
                    onChange={setAuthorFilter}
                  />
                )}
                <div className={cn('grid gap-3', hasReview ? 'sm:grid-cols-[minmax(0,1fr)_13rem_13rem]' : 'sm:grid-cols-[minmax(0,1fr)_16rem]')}>
                  <Input
                    leftIcon={<Search sx={{ fontSize: 20 }} />}
                    placeholder={seesAll ? 'بحث بالوصف أو اسم المُدخل' : 'بحث بالوصف أو التصنيف'}
                    aria-label="بحث في المصروفات"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {hasReview && (
                    <Select
                      aria-label="تصفية حسب حالة الاعتماد"
                      value={approvalFilter}
                      onChange={(e) => { setApprovalFilter(e.target.value as ApprovalFilter); setConfirmAll(false); }}
                    >
                      {statusOptions.map((o) => (
                        <option key={o.value} value={o.value}>{`${o.label} (${o.count})`}</option>
                      ))}
                    </Select>
                  )}
                  <Select
                    aria-label="تصفية حسب التصنيف"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="all">كل التصنيفات</option>
                    {Object.entries(expenseCategories).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {filtered.length === 0 ? (
                <EmptyState
                  Icon={Search}
                  title="لا نتائج مطابقة"
                  description="غيّر كلمة البحث أو أزل التصفية لرؤية كل المصروفات."
                  action={
                    <Button variant="outline" onClick={resetFilters}>
                      إزالة التصفية
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-1">
                  {filtering && (
                    <p className="px-1 pb-1 text-xs text-fg-muted">
                      {filtered.length} من {visibleExpenses.length} سجل · {formatCurrencyDisplay(sumAmounts(filtered.map((e) => e.amount)))}
                    </p>
                  )}
                  {groups.map((g) => (
                    <StickyGroup
                      key={g.key}
                      title={dayLabel(g.items[0].date)}
                      trailing={`${dayTotals.get(g.key)!.count} ${dayTotals.get(g.key)!.count === 1 ? 'مصروف' : 'مصروفات'} · ${formatCurrencyDisplay(dayTotals.get(g.key)!.sum)}`}
                    >
                      {g.items.map((exp) => (
                        <ExpenseRow
                          key={exp.id}
                          expense={exp}
                          clientName={clientName.get(exp.clientId) || 'مجهول'}
                          showAuthor={seesAll}
                          authorRole={showRoles ? expenseAuthorRole(exp, authorRoles) : null}
                          canEdit={access.canEditExpense(exp)}
                          onOpen={() => openExpense(exp)}
                          onDelete={access.canDeleteExpense(exp) ? () => askDelete(exp) : undefined}
                          onApprove={canApprove && !isExpenseLocked(exp) ? () => void approveOne(exp.id) : undefined}
                          approving={approving.has(exp.id)}
                        />
                      ))}
                    </StickyGroup>
                  ))}
                  <ShowMoreRows hidden={hidden} pageSize={pageSize} noun="مصروف" onMore={showMore} />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <ExpenseFormSheet
        open={sheet.open}
        edit={sheet.edit}
        clients={clients}
        phases={projectPhases}
        userId={user?.id}
        fundStats={myFundStats}
        readOnlyNotice={editNotice}
        onClose={closeSheet}
        onSubmit={handleSubmit}
        onDelete={sheet.edit && access.canDeleteExpense(sheet.edit) ? (e) => askDelete(e) : undefined}
        review={
          sheet.edit
            ? {
                canDecide: canApprove && !isExpenseLocked(sheet.edit),
                onApprove: async () => {
                  await approveExpenses([sheet.edit!.id]);
                  closeSheet();
                },
                onReject: async (reason) => {
                  await rejectExpense(sheet.edit!.id, reason);
                  closeSheet();
                },
              }
            : undefined
        }
      />

      <ConfirmDeleteModal
        open={!!pendingDelete}
        title="حذف هذا المصروف؟"
        description={
          pendingDelete
            ? `سيُحذف «${pendingDelete.description}» بقيمة ${formatCurrencyDisplay(pendingDelete.amount)} من ${clientName.get(pendingDelete.clientId) || 'المشروع'}${pendingDelete.attachmentUrl ? ' مع مرفقه' : ''}. لا يمكن التراجع.`
            : ''
        }
        confirmLabel="حذف المصروف"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </PageShell>
  );
};
