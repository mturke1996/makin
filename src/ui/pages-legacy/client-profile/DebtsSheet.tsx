import { useDeferredValue, useMemo, useState } from 'react';
import { Add, RequestQuote } from '../../../design-system/icons';
import { Amount, Avatar, Badge, Button, EmptyState, ProgressBar, Segmented, Sheet } from '../../../design-system/primitives';
import {
  EMPTY_DEBT_QUERY,
  debtFacets,
  debtStateOf,
  filterDebts,
  formatDayText,
  limitGroups,
  splitDebts,
  summarizeDebts,
  type DebtQuery,
  type DebtState,
  type DebtStatusFilter,
  type RecordGroup,
  type RecordSort,
} from '../../../core/finance/clientRecords';
import type { Client, StandaloneDebt } from '../../../types';
import { LedgerGroup, LedgerRow, PdfActions } from './LedgerParts';
import { countPhrase } from './moduleCopy';
import { FilterGroup, MultiChips, SingleChips } from './records/filterControls';
import { RecordsNoResults, ShowMore } from './records/RecordsList';
import { RecordsFilterBar, type ActiveFilter } from './records/RecordsFilterBar';
import { RecordsSummary } from './records/RecordsSummary';
import { countCaption } from './records/recordLabels';
import { RecordsSkeleton } from './records/RecordsSkeleton';
import { usePagedLimit, useResetOnClose } from './records/useRecordsView';

const STATE: Record<DebtState, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  settled: { label: 'مسدد', tone: 'success' },
  overdue: { label: 'متأخر', tone: 'danger' },
  partial: { label: 'مسدد جزئياً', tone: 'warning' },
  unpaid: { label: 'غير مسدد', tone: 'warning' },
};

const STATUS_LABEL: Record<DebtStatusFilter, string> = { all: 'الكل', open: 'غير مسدد', overdue: 'متأخر', settled: 'مسدد' };
const SORT_LABEL: Record<RecordSort, string> = { newest: 'الأحدث', oldest: 'الأقدم', largest: 'الأكبر متبقياً' };

interface DebtsSheetProps {
  open: boolean;
  onClose: () => void;
  client: Client;
  clientDebts: StandaloneDebt[];
  totalDebts: number;
  pdfLoading: boolean;
  /** Omitted when this person may not record debts (`debts.manage`): the sheet is then read-only. */
  onAdd?: () => void;
  onEdit?: (debt: StandaloneDebt) => void;
  /** Omitted when this user may not delete (`debts.delete`). */
  onDelete?: (debt: StandaloneDebt) => void;
  /** The statement PDF needs the full picture, so these exist only where the summary is shown. */
  onDownloadPdf?: () => void;
  onSharePdf?: () => void;
  /** True while the records are still arriving: shows a skeleton instead of «no records yet». */
  loading?: boolean;
}

/** Debts on this client: what is owed first, each with how much of it is already settled. */
export function DebtsSheet({
  open,
  onClose,
  client,
  clientDebts,
  totalDebts,
  pdfLoading,
  onAdd,
  onEdit,
  onDelete,
  onDownloadPdf,
  onSharePdf,
  loading,
}: DebtsSheetProps) {
  const [query, setQuery] = useState<DebtQuery>(EMPTY_DEBT_QUERY);
  useResetOnClose(open, () => setQuery(EMPTY_DEBT_QUERY));

  const deferredSearch = useDeferredValue(query.search);
  const effective = useMemo(() => ({ ...query, search: deferredSearch }), [query, deferredSearch]);
  const filtered = useMemo(() => filterDebts(clientDebts, effective), [clientDebts, effective]);
  const facets = useMemo(() => debtFacets(clientDebts, effective), [clientDebts, effective]);
  const summary = useMemo(() => summarizeDebts(filtered), [filtered]);

  const groups = useMemo<RecordGroup<StandaloneDebt>[]>(() => {
    const { open: openDebts, settled } = splitDebts(filtered);
    const make = (key: string, items: StandaloneDebt[], total: number): RecordGroup<StandaloneDebt> => ({
      key,
      kind: 'all',
      items,
      count: items.length,
      total,
    });
    return [
      ...(openDebts.length > 0 ? [make('open', openDebts, summarizeDebts(openDebts).remaining)] : []),
      ...(settled.length > 0 ? [make('settled', settled, summarizeDebts(settled).value)] : []),
    ];
  }, [filtered]);
  const { limit, more } = usePagedLimit(JSON.stringify(effective));
  const page = useMemo(() => limitGroups(groups, limit), [groups, limit]);

  const filtering = query.search.trim() !== '' || query.status !== 'all' || query.parties.length > 0;
  const patch = (next: Partial<DebtQuery>) => setQuery((q) => ({ ...q, ...next }));
  const clearAll = () => setQuery(EMPTY_DEBT_QUERY);

  const active: ActiveFilter[] = [
    ...(query.status !== 'all'
      ? [{ key: 'status', label: `الحالة: ${STATUS_LABEL[query.status]}`, onRemove: () => patch({ status: 'all' }) }]
      : []),
    ...query.parties.map((key) => ({
      key: `p:${key}`,
      label: `الطرف: ${facets.parties.find((p) => p.key === key)?.label ?? 'طرف'}`,
      onRemove: () => patch({ parties: query.parties.filter((k) => k !== key) }),
    })),
    ...(query.sort !== 'newest'
      ? [{ key: 'sort', label: `الترتيب: ${SORT_LABEL[query.sort]}`, onRemove: () => patch({ sort: 'newest' }) }]
      : []),
  ];
  const statusOptions = (['open', 'overdue', 'settled'] as const).map((key) => ({
    key,
    label: STATUS_LABEL[key],
    count: facets.status[key],
    amount: 0,
  }));

  const renderDebt = (d: StandaloneDebt) => {
    const state = STATE[debtStateOf(d)];
    const pct = d.amount > 0 ? Math.min(100, (d.paidAmount / d.amount) * 100) : 0;
    const date = formatDayText(d.date);
    const due = formatDayText(d.dueDate);
    return (
      <LedgerRow
        key={d.id}
        leading={<Avatar name={d.partyName} tone="warning" />}
        title={d.partyName}
        subtitle={d.description || date}
        meta={
          <>
            <Badge tone={state.tone} dot>
              {state.label}
            </Badge>
            <span className="text-xs text-fg-muted">
              <bdi dir="ltr" className="tabular-nums">
                {date}
              </bdi>
              {due && (
                <>
                  {' · الاستحقاق '}
                  <bdi dir="ltr" className="tabular-nums">
                    {due}
                  </bdi>
                </>
              )}
            </span>
          </>
        }
        trailing={
          <span className="block">
            <span className="block text-2xs text-fg-muted">المتبقي</span>
            <Amount
              amount={d.remainingAmount}
              tone={d.remainingAmount > 0 ? 'danger' : 'success'}
              className="text-md font-bold"
            />
          </span>
        }
        extra={
          <div className="flex items-center gap-3">
            <ProgressBar value={pct} tone={d.remainingAmount > 0 ? 'brand' : 'success'} label={`نسبة سداد دين ${d.partyName}`} />
            <span className="flex-none text-xs tabular-nums text-fg-subtle">
              مسدد <Amount amount={d.paidAmount} bare /> من <Amount amount={d.amount} />
            </span>
          </div>
        }
        onOpen={onEdit ? () => onEdit(d) : undefined}
        onDelete={onDelete ? () => onDelete(d) : undefined}
        editLabel={`تعديل دين ${d.partyName}`}
        deleteLabel={`حذف دين ${d.partyName}`}
      />
    );
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="الديون"
      subtitle={
        client?.name ? `${client.name} · ${countPhrase('debts', clientDebts.length)}` : countPhrase('debts', clientDebts.length)
      }
      maxWidth="lg"
      footer={
        onAdd ? (
          <Button block leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={onAdd}>
            إضافة دين
          </Button>
        ) : undefined
      }
    >
      <div className="min-h-[40vh]">
        {loading && clientDebts.length === 0 ? (
          <RecordsSkeleton />
        ) : clientDebts.length === 0 ? (
          <div className="px-4 py-5 lg:px-6">
            <EmptyState
              Icon={RequestQuote}
              title="لا توجد ديون بعد"
              description={
                onAdd
                  ? 'سجّل أي مبلغ مستحق على المشروع لطرف خارجي بقيمته وتاريخه، ويظهر المتبقي منه في حساب العميل. اضغط إضافة دين للبدء.'
                  : 'لم يُسجَّل أي دين على هذا المشروع بعد.'
              }
            />
          </div>
        ) : (
          <>
            <div className="px-4 pb-3 pt-4 lg:px-6">
              <RecordsSummary
                eyebrow={filtering ? 'المتبقي ضمن التصفية' : 'إجمالي المتبقي'}
                tone="warning"
                figure={<Amount amount={filtering ? summary.remaining : totalDebts} />}
                caption={
                  filtering
                    ? countCaption('debts', summary.count, true)
                    : `${summary.openCount} غير مسدد من ${clientDebts.length}`
                }
                context={
                  filtering ? (
                    <>
                      من إجمالي <Amount amount={totalDebts} />
                    </>
                  ) : summary.overdueCount > 0 ? (
                    `${summary.overdueCount} منها متأخر`
                  ) : undefined
                }
                stats={[
                  { label: 'قيمة الديون', value: <Amount amount={summary.value} /> },
                  { label: 'تم سداده', value: <Amount amount={summary.paid} /> },
                ]}
              >
                <div className="flex items-center gap-3">
                  <ProgressBar value={summary.paidPercent} tone="success" label="نسبة ما سُدد من قيمة الديون" />
                  <span className="flex-none text-xs font-semibold tabular-nums text-fg-subtle">
                    سُدد <bdi dir="ltr">{summary.paidPercent}%</bdi>
                  </span>
                </div>
              </RecordsSummary>
            </div>

            <RecordsFilterBar
              searchLabel="بحث في الديون"
              placeholder="ابحث في الديون"
              search={query.search}
              onSearchChange={(search) => patch({ search })}
              active={active}
              onClearAll={clearAll}
              shown={filtered.length}
              total={clientDebts.length}
            >
              <FilterGroup title="الحالة">
                <SingleChips
                  options={statusOptions}
                  value={query.status === 'all' ? '' : query.status}
                  onChange={(key) => patch({ status: (key || 'all') as DebtStatusFilter })}
                  allCount={facets.status.all}
                />
              </FilterGroup>
              {(facets.parties.length > 1 || query.parties.length > 0) && (
                <FilterGroup title="الطرف">
                  <MultiChips
                    options={facets.parties}
                    selected={query.parties}
                    onToggle={(key) =>
                      patch({
                        parties: query.parties.includes(key) ? query.parties.filter((k) => k !== key) : [...query.parties, key],
                      })
                    }
                    moreLabel="عرض كل الأطراف"
                  />
                </FilterGroup>
              )}
              <FilterGroup title="الترتيب">
                <Segmented<RecordSort>
                  aria-label="ترتيب الديون"
                  value={query.sort}
                  onChange={(sort) => patch({ sort })}
                  options={(Object.keys(SORT_LABEL) as RecordSort[]).map((value) => ({ value, label: SORT_LABEL[value] }))}
                />
              </FilterGroup>
            </RecordsFilterBar>

            <div className="space-y-5 px-4 pb-8 pt-1 lg:px-6">
              {filtered.length === 0 ? (
                <RecordsNoResults
                  description="لا يوجد دين بهذه الشروط. جرّب اسماً آخر، أو أزل بعض عناصر التصفية."
                  onReset={clearAll}
                />
              ) : (
                page.groups.map((group) => (
                  <LedgerGroup
                    key={group.key}
                    sticky
                    title={group.key === 'open' ? 'غير مسدد' : 'مسدد'}
                    count={countPhrase('debts', group.count)}
                    trailing={<Amount amount={group.total} tone={group.key === 'open' ? 'danger' : 'success'} />}
                  >
                    {group.items.map(renderDebt)}
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
