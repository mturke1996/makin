import { useDeferredValue, useMemo, useState } from 'react';
import { Add, ReceiptLong } from '@mui/icons-material';
import { Amount, Button, EmptyState, Segmented, Sheet } from '../../../design-system/primitives';
import { useAccess } from '../../../core/access/useAccess';
import {
  buildAuthorRoleIndex,
  countByAuthorRole,
  expenseAuthorRole,
  matchesAuthorFilter,
  type AuthorFilter,
} from '../../../core/access/expenseBadge';
import {
  EMPTY_EXPENSE_QUERY,
  expenseFacets,
  expenseSerials,
  filterExpenses,
  formatDayText,
  groupRecords,
  isOpenRange,
  limitGroups,
  summarizeExpenses,
  type ExpenseContext,
  type ExpenseQuery,
  type GroupBy,
  type RecordSort,
} from '../../../core/finance/clientRecords';
import type { Client, Expense } from '../../../types';
import { LedgerGroup, PdfActions } from './LedgerParts';
import { countPhrase } from './moduleCopy';
import { FundBanner, UserBalanceBanner } from './profileBanners';
import { DateRangeFilter, FilterGroup, MultiChips, rangeLabel } from './records/filterControls';
import { ExpenseRow } from './records/ExpenseRow';
import { expenseCategoryLabel, countCaption } from './records/recordLabels';
import { groupTitle, RecordsNoResults, ShowMore } from './records/RecordsList';
import { RecordsFilterBar, type ActiveFilter } from './records/RecordsFilterBar';
import { RecordsSummary, ShareList } from './records/RecordsSummary';
import { RecordsSkeleton } from './records/RecordsSkeleton';
import { usePagedLimit, useResetOnClose } from './records/useRecordsView';
import type { FundStats, SystemUser, UserBalanceInfo } from './types';

interface ExpensesSheetProps {
  open: boolean;
  onClose: () => void;
  client: Client;
  /** Already limited to what the signed-in user may list (everyone's, or only their own). */
  clientExpenses: Expense[];
  /** The users directory, when the person may read it: it tells admin from employee on each row. */
  systemUsers: SystemUser[];
  globalFundStats: FundStats | null;
  currentUserBalanceInfo: UserBalanceInfo | null;
  userName: string;
  totalExpenses: number;
  pdfLoading: boolean;
  onAdd: () => void;
  /** Opens the expense: editable, or read-only with the reason when the policy does not let this person change it. */
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  /** The statement PDF needs the full picture, so these exist only where the summary is shown. */
  onDownloadPdf?: () => void;
  onSharePdf?: () => void;
  /** True while the records are still arriving: shows a skeleton instead of «no records yet». */
  loading?: boolean;
}

const SORT_LABEL: Record<RecordSort, string> = { newest: 'الأحدث', oldest: 'الأقدم', largest: 'الأكبر مبلغاً' };
const ROLE_LABEL: Record<Exclude<AuthorFilter, 'all'>, string> = { employee: 'الموظفون', admin: 'الإدارة' };
type Breakdown = 'category' | 'person';

export function ExpensesSheet({
  open,
  onClose,
  client,
  clientExpenses,
  systemUsers,
  globalFundStats,
  currentUserBalanceInfo,
  userName,
  totalExpenses,
  pdfLoading,
  onAdd,
  onEdit,
  onDelete,
  onDownloadPdf,
  onSharePdf,
  loading,
}: ExpensesSheetProps) {
  const access = useAccess();
  const seesAll = access.expenseScope === 'all';
  const canCreate = access.can('expenses.create');

  const [query, setQuery] = useState<ExpenseQuery>(EMPTY_EXPENSE_QUERY);
  const [roleFilter, setRoleFilter] = useState<AuthorFilter>('all');
  const [grouping, setGrouping] = useState<Exclude<GroupBy, 'none'>>('month');
  const [breakdown, setBreakdown] = useState<Breakdown>('category');
  useResetOnClose(open, () => {
    setQuery(EMPTY_EXPENSE_QUERY);
    setRoleFilter('all');
    setGrouping('month');
    setBreakdown('category');
  });

  const authorRoles = useMemo(() => buildAuthorRoleIndex(systemUsers), [systemUsers]);
  const showRoles = seesAll && systemUsers.length > 0;
  const authorCounts = useMemo(() => countByAuthorRole(clientExpenses, authorRoles), [clientExpenses, authorRoles]);
  const activeRole: AuthorFilter = showRoles ? roleFilter : 'all';

  const ctx = useMemo<ExpenseContext>(() => {
    const names = new Map<string, string>();
    for (const u of systemUsers) {
      if (!u.displayName) continue;
      names.set(u.id, u.displayName);
      if (u.uid) names.set(u.uid, u.displayName);
    }
    return {
      categoryLabel: expenseCategoryLabel,
      nameOfUser: (id) => names.get(id),
      predicate: activeRole === 'all' ? undefined : (e) => matchesAuthorFilter(e, authorRoles, activeRole),
    };
  }, [systemUsers, authorRoles, activeRole]);

  // Typing stays instant; the list catches up when the keyboard lets it.
  const deferredSearch = useDeferredValue(query.search);
  const effective = useMemo(() => ({ ...query, search: deferredSearch }), [query, deferredSearch]);

  const filtered = useMemo(() => filterExpenses(clientExpenses, effective, ctx), [clientExpenses, effective, ctx]);
  const facets = useMemo(() => expenseFacets(clientExpenses, effective, ctx), [clientExpenses, effective, ctx]);
  const summary = useMemo(() => summarizeExpenses(filtered, ctx), [filtered, ctx]);

  /** #1 is the oldest expense; the newest gets the largest number. */
  const serialById = useMemo(() => expenseSerials(clientExpenses), [clientExpenses]);

  const groupBy: GroupBy = query.sort === 'largest' ? 'none' : grouping;
  const groups = useMemo(
    () =>
      groupRecords(
        filtered,
        (e) => e.date,
        (e) => e.amount,
        groupBy
      ),
    [filtered, groupBy]
  );
  const resetKey = JSON.stringify([effective, activeRole, groupBy]);
  const { limit, more } = usePagedLimit(resetKey);
  const page = useMemo(() => limitGroups(groups, limit), [groups, limit]);

  const hasSearch = query.search.trim() !== '';
  const filtering =
    hasSearch || query.categories.length > 0 || query.people.length > 0 || !isOpenRange(query.range) || activeRole !== 'all';

  const patch = (next: Partial<ExpenseQuery>) => setQuery((q) => ({ ...q, ...next }));
  const toggle = (list: readonly string[], key: string) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
  const clearAll = () => {
    setQuery(EMPTY_EXPENSE_QUERY);
    setRoleFilter('all');
  };

  const active: ActiveFilter[] = [
    ...query.categories.map((key) => ({
      key: `c:${key}`,
      label: `التصنيف: ${expenseCategoryLabel(key)}`,
      onRemove: () => patch({ categories: query.categories.filter((k) => k !== key) }),
    })),
    ...query.people.map((key) => ({
      key: `p:${key}`,
      label: `المُدخل: ${facets.people.find((p) => p.key === key)?.label ?? 'مستخدم'}`,
      onRemove: () => patch({ people: query.people.filter((k) => k !== key) }),
    })),
    ...(activeRole !== 'all'
      ? [{ key: 'role', label: `المُدخل: ${ROLE_LABEL[activeRole]}`, onRemove: () => setRoleFilter('all') }]
      : []),
    ...(!isOpenRange(query.range)
      ? [
          {
            key: 'range',
            label: rangeLabel(query.range, formatDayText),
            onRemove: () => patch({ range: EMPTY_EXPENSE_QUERY.range }),
          },
        ]
      : []),
    ...(query.sort !== 'newest'
      ? [{ key: 'sort', label: `الترتيب: ${SORT_LABEL[query.sort]}`, onRemove: () => patch({ sort: 'newest' }) }]
      : []),
  ];

  const sortOptions = (Object.keys(SORT_LABEL) as RecordSort[]).map((value) => ({ value, label: SORT_LABEL[value] }));
  // A breakdown by person with one person in it says nothing: fall back to the categories (and keep the switch).
  const byPerson = seesAll && breakdown === 'person' && summary.byPerson.length > 1;
  const shares = byPerson ? summary.byPerson : summary.byCategory;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={seesAll ? 'المصروفات' : 'مصروفاتي'}
      subtitle={client?.name}
      maxWidth="lg"
      footer={
        canCreate ? (
          <Button block leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={onAdd}>
            إضافة مصروف
          </Button>
        ) : undefined
      }
    >
      <div className="min-h-[40vh]">
        {loading && clientExpenses.length === 0 ? (
          <RecordsSkeleton />
        ) : clientExpenses.length === 0 ? (
          <div className="space-y-3 px-4 py-5 lg:px-6">
            {(globalFundStats || currentUserBalanceInfo) && (
              <>
                {globalFundStats && <FundBanner title="رصيد العهدة العام المتاح" stats={globalFundStats} />}
                {currentUserBalanceInfo && <UserBalanceBanner info={currentUserBalanceInfo} userName={userName} />}
              </>
            )}
            <EmptyState
              Icon={ReceiptLong}
              title="لا توجد مصروفات بعد"
              description={
                canCreate
                  ? 'سجّل كل ما يُصرف على هذا المشروع بوصفه ومبلغه وتصنيفه، ويظهر هنا مرتباً بالأشهر مع ملخص يوضح أين ذهبت الأموال. اضغط إضافة مصروف للبدء.'
                  : 'لم يُسجَّل أي مصروف على هذا المشروع بعد. تظهر المصروفات هنا مرتبة بالأشهر.'
              }
            />
          </div>
        ) : (
          <>
            <div className="space-y-3 px-4 pb-3 pt-4 lg:px-6">
              {globalFundStats && <FundBanner title="رصيد العهدة العام المتاح" stats={globalFundStats} />}
              {currentUserBalanceInfo && <UserBalanceBanner info={currentUserBalanceInfo} userName={userName} />}
              <RecordsSummary
                eyebrow={filtering ? 'المصروفات المطابقة' : seesAll ? 'إجمالي المصروفات' : 'ما سجّلته أنت على هذا المشروع'}
                tone="danger"
                figure={<Amount amount={filtering ? summary.total : totalExpenses} />}
                caption={countCaption('expenses', filtering ? summary.count : clientExpenses.length, filtering)}
                context={
                  filtering ? (
                    <>
                      من إجمالي <Amount amount={totalExpenses} />
                    </>
                  ) : undefined
                }
                partialNote={
                  seesAll ? undefined : 'تظهر هنا المصروفات التي سجّلتها أنت فقط، ولا تشمل ما سجّله غيرك على هذا المشروع.'
                }
              >
                {shares.length > 1 && (
                  <ShareList
                    title={byPerson ? 'المصروف حسب المُدخل' : 'أين ذهبت المصروفات'}
                    rows={shares}
                    expandLabel="عرض التفاصيل"
                    switcher={
                      seesAll ? (
                        <Segmented<Breakdown>
                          aria-label="توزيع المصروفات"
                          value={byPerson ? 'person' : 'category'}
                          onChange={setBreakdown}
                          options={[
                            { value: 'category', label: 'حسب التصنيف' },
                            { value: 'person', label: 'حسب المُدخل' },
                          ]}
                        />
                      ) : undefined
                    }
                  />
                )}
              </RecordsSummary>
            </div>

            <RecordsFilterBar
              searchLabel="بحث في المصروفات"
              placeholder="ابحث في المصروفات"
              search={query.search}
              onSearchChange={(search) => patch({ search })}
              active={active}
              onClearAll={clearAll}
              shown={filtered.length}
              total={clientExpenses.length}
            >
              <FilterGroup title="الفترة">
                <DateRangeFilter value={query.range} onChange={(range) => patch({ range })} />
              </FilterGroup>
              {facets.categories.length > 1 || query.categories.length > 0 ? (
                <FilterGroup title="التصنيف">
                  <MultiChips
                    options={facets.categories}
                    selected={query.categories}
                    onToggle={(key) => patch({ categories: toggle(query.categories, key) })}
                    moreLabel="عرض كل التصنيفات"
                  />
                </FilterGroup>
              ) : null}
              {showRoles && (
                <FilterGroup title="المُدخل">
                  <div className="space-y-3">
                    <Segmented<AuthorFilter>
                      aria-label="تصفية المصروفات حسب المُدخل"
                      value={roleFilter}
                      onChange={setRoleFilter}
                      options={[
                        { value: 'all', label: 'الكل', count: authorCounts.all },
                        { value: 'employee', label: 'الموظفون', count: authorCounts.employee },
                        { value: 'admin', label: 'الإدارة', count: authorCounts.admin },
                      ]}
                    />
                    {facets.people.length > 1 && (
                      <MultiChips
                        options={facets.people}
                        selected={query.people}
                        onToggle={(key) => patch({ people: toggle(query.people, key) })}
                        moreLabel="عرض كل المُدخلين"
                      />
                    )}
                  </div>
                </FilterGroup>
              )}
              <FilterGroup title="الترتيب">
                <Segmented<RecordSort>
                  aria-label="ترتيب المصروفات"
                  value={query.sort}
                  onChange={(sort) => patch({ sort })}
                  options={sortOptions}
                />
              </FilterGroup>
              {query.sort !== 'largest' && (
                <FilterGroup title="التجميع">
                  <Segmented<Exclude<GroupBy, 'none'>>
                    aria-label="تجميع المصروفات"
                    value={grouping}
                    onChange={setGrouping}
                    options={[
                      { value: 'month', label: 'حسب الشهر' },
                      { value: 'day', label: 'حسب اليوم' },
                    ]}
                  />
                </FilterGroup>
              )}
            </RecordsFilterBar>

            <div className="space-y-5 px-4 pb-8 pt-1 lg:px-6">
              {filtered.length === 0 ? (
                <RecordsNoResults
                  description="لا يوجد مصروف بهذه الشروط. جرّب كلمة أخرى، أو أزل بعض عناصر التصفية لعرض كل مصروفات المشروع."
                  onReset={clearAll}
                />
              ) : (
                page.groups.map((group) => (
                  <LedgerGroup
                    key={group.key}
                    sticky={groupBy !== 'none'}
                    title={groupBy === 'none' ? `مرتبة حسب ${SORT_LABEL.largest}` : groupTitle(group)}
                    count={countPhrase('expenses', group.count)}
                    trailing={<Amount amount={group.total} />}
                  >
                    {group.items.map((exp) => (
                      <ExpenseRow
                        key={exp.id}
                        expense={exp}
                        serial={serialById.get(exp.id) ?? 0}
                        showAuthor={seesAll}
                        authorRole={showRoles ? expenseAuthorRole(exp, authorRoles) : null}
                        canEdit={access.canEditExpense(exp)}
                        canDelete={access.canDeleteExpense(exp)}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    ))}
                  </LedgerGroup>
                ))
              )}
              <ShowMore hidden={page.hidden} onMore={more} />

              {onDownloadPdf && onSharePdf && <PdfActions loading={pdfLoading} onDownload={onDownloadPdf} onShare={onSharePdf} />}
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
