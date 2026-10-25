import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Add, Receipt, Search, TrendingDown } from '../../design-system/icons';
import { useDataStore } from '../../stores/useDataStore';
import toast from 'react-hot-toast';
import { EXPENSE_CLOSED_MESSAGE, expenseReadOnlyNotice, isExpenseLocked } from '../../core/finance/expenseLock';
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
} from '../../design-system/primitives';
import type { Expense } from '../../types';
import { useUsersDirectory } from './client-profile/useUsersDirectory';
import { CategoryBreakdown, type CategoryTotal } from './money/CategoryBreakdown';
import { ExpenseFormSheet, type ExpenseFormData } from './money/ExpenseFormSheet';
import { ExpenseRow } from './money/ExpenseRow';
import { FundBanner } from './money/FundBanner';
import { ConfirmDeleteModal, FigureStripSkeleton, ListSkeleton, StickyGroup } from './money/moneyUi';
import { dayKey, dayLabel, groupBy, isSameMonthAsToday, matchesQuery, sumAmounts } from './money/moneyUtils';

/**
 * Expenses. What this page lists is decided by the access policy: a field employee sees (and
 * totals) their own expenses and the page says so ("مصروفاتي"); someone with `expenses.view.all`
 * sees everyone's, with who recorded each one taken from the users directory.
 */
export const ExpensesPage = () => {
  const navigate = useNavigate();
  const access = useAccess();
  const { expenses, addExpense, updateExpense, deleteExpense, clients, isLoading } = useDataStore();
  const user = useAuthStore((s) => s.user);
  const myFundStats = useMyFundStats();

  const seesAll = access.expenseScope === 'all';
  const canCreate = access.can('expenses.create');

  // The directory tells admin from employee on each row; only people who see everyone's expenses need it.
  const directory = useUsersDirectory(seesAll && access.canViewDirectory);
  const authorRoles = useMemo(() => buildAuthorRoleIndex(directory), [directory]);
  const showRoles = seesAll && directory.length > 0;

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [authorFilter, setAuthorFilter] = useState<AuthorFilter>('all');
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
          return matchCategory && matchSearch && matchAuthor;
        })
        .sort(
          (a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime() ||
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [visibleExpenses, searchQuery, categoryFilter, authorFilter, showRoles, authorRoles, clientName]
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

  const filtering = !!searchQuery.trim() || categoryFilter !== 'all' || (showRoles && authorFilter !== 'all');
  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setAuthorFilter('all');
  };

  const authorOptions = [
    { value: 'all' as AuthorFilter, label: 'الكل', count: authorCounts.all },
    { value: 'employee' as AuthorFilter, label: 'مصروفات الموظفين', count: authorCounts.employee },
    { value: 'admin' as AuthorFilter, label: 'مصروفات الإدارة', count: authorCounts.admin },
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
                {showRoles && (
                  <Segmented<AuthorFilter>
                    layout="scroll"
                    aria-label="مصدر المصروف"
                    options={authorOptions}
                    value={authorFilter}
                    onChange={setAuthorFilter}
                  />
                )}
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]">
                  <Input
                    leftIcon={<Search sx={{ fontSize: 20 }} />}
                    placeholder={seesAll ? 'بحث بالوصف أو اسم المُدخل' : 'بحث بالوصف أو التصنيف'}
                    aria-label="بحث في المصروفات"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
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
