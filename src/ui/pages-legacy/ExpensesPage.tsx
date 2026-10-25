import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Add, Check, HourglassEmpty, CancelOutlined, Receipt, Search, TrendingDown } from '../../design-system/icons';
import { useDataStore } from '../../stores/useDataStore';
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
  FigureStrip,
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
import { ConfirmDeleteModal, FigureStripSkeleton, ListSkeleton, StickyGroup } from './money/moneyUi';
import { ProfileCallout } from './client-profile/profileUi';
import { dayKey, dayLabel, groupBy, isSameMonthAsToday, matchesQuery, sumAmounts } from './money/moneyUtils';

/**
 * Expenses. What this page lists is decided by the access policy: a field employee sees (and
 * totals) their own expenses and the page says so ("مصروفاتي"); someone with `expenses.view.all`
 * sees everyone's, with who recorded each one taken from the users directory.
 */
export const ExpensesPage = () => {
  const navigate = useNavigate();
  const access = useAccess();
  const { expenses, addExpense, updateExpense, deleteExpense, approveExpenses, rejectExpense, clients, isLoading } = useDataStore();
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

  const filtered = useMemo(
    () =>
      visibleExpenses
        .filter((e) => {
          const matchCategory = categoryFilter === 'all' || e.category === categoryFilter;
          const matchSearch = matchesQuery(
            searchQuery,
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
    [visibleExpenses, searchQuery, categoryFilter, authorFilter, approvalFilter, showRoles, authorRoles, clientName]
  );
  const groups = useMemo(() => groupBy(filtered, (e) => dayKey(e.date)), [filtered]);

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

  const totalExpenses = useMemo(() => sumAmounts(visibleExpenses.map((e) => e.amount)), [visibleExpenses]);
  const monthExpenses = useMemo(
    () => sumAmounts(visibleExpenses.filter((e) => isSameMonthAsToday(e.date)).map((e) => e.amount)),
    [visibleExpenses]
  );

  const openAdd = () => setSheet({ open: true, edit: null });
  // Every row opens: an expense the person may not change (closed, or not theirs) opens read-only with the reason.
  const openExpense = (e: Expense) => setSheet({ open: true, edit: e });
  const askDelete = (e: Expense) => {
    if (!access.canDeleteExpense(e)) {
      if (isExpenseLocked(e)) toast.error(EXPENSE_CLOSED_MESSAGE);
      return;
    }
    setPendingDelete(e);
  };
  const closeSheet = () => setSheet((s) => ({ ...s, open: false }));

  const handleSubmit = async (data: ExpenseFormData) => {
    const editing = sheet.edit;
    // The form already offers no way to get here without the right; this keeps a stale screen from writing.
    if (editing ? !access.canEditExpense(editing) : !canCreate) throw new Error('not-allowed');
    if (!editing && !user?.id) {
      toast.error('تعذّر تحديد حسابك، أعد تسجيل الدخول ثم حاول مجدداً');
      throw new Error('no-user');
    }
    const expenseId = editing?.id || crypto.randomUUID();
    // quantity x price is optional; zeros clear a line that existed before
    const qtyFields =
      data.quantity != null
        ? { quantity: data.quantity, unitPrice: data.unitPrice, unit: data.unit }
        : data.clearQuantity
          ? { quantity: 0, unitPrice: 0, unit: '' }
          : {};
    const payload = {
      description: data.description,
      amount: data.amount,
      category: data.category as Expense['category'],
      date: data.date,
      ...(data.invoiceNumber ? { invoiceNumber: data.invoiceNumber } : {}),
      notes: data.notes,
      clientId: data.clientId,
      ...qtyFields,
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
        createdAt: new Date().toISOString(),
        userId: user!.id,
        createdBy: user?.displayName || 'غير معروف',
      });
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
  const approveAllShown = async () => {
    try {
      await approveExpenses(waitingToApprove.map((e) => e.id));
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
          <FigureStripSkeleton />
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
          <FigureStrip
            figures={[
              {
                label: seesAll ? 'إجمالي المصروفات' : 'إجمالي مصروفاتي',
                value: <Amount amount={totalExpenses} tone="danger" />,
                tone: 'danger',
              },
              { label: 'هذا الشهر', value: <Amount amount={monthExpenses} /> },
              { label: 'عدد السجلات', value: visibleExpenses.length },
              { label: 'عدد التصنيفات', value: categoryTotals.length },
            ]}
          />

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
                      trailing={`${g.items.length} ${g.items.length === 1 ? 'مصروف' : 'مصروفات'} · ${formatCurrencyDisplay(sumAmounts(g.items.map((e) => e.amount)))}`}
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
                          onApprove={canApprove && !isExpenseLocked(exp) ? () => void approveExpenses([exp.id]) : undefined}
                        />
                      ))}
                    </StickyGroup>
                  ))}
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
