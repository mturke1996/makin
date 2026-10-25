import { useMemo, useState } from 'react';
import { Add, Edit, Delete, TableChart, FileDownload } from '../../../design-system/icons';
import { Amount, Badge, Button, EmptyState, IconButton, Segmented, Sheet } from '../../../design-system/primitives';
import { buildShares } from '../../../core/finance/clientRecords';
import { formatDecimalNumber } from '../../../core/utils-formatters';
import { exportBoqToExcel, BOQ_UNIT_LABELS } from '../../../features/export/excelExport';
import type { Client, ProjectPhase, BoqLineItem } from '../../../types';
import { LedgerGroup } from './LedgerParts';
import { countPhrase } from './moduleCopy';
import { FilterGroup, MultiChips, SingleChips } from './records/filterControls';
import { RecordsNoResults } from './records/RecordsList';
import { RecordsFilterBar, type ActiveFilter } from './records/RecordsFilterBar';
import { RecordsSummary, ShareList } from './records/RecordsSummary';
import {
  BOQ_LOOSE_TITLE,
  EMPTY_BOQ_QUERY,
  boqFacets,
  buildBoqGroups,
  summarizeBoq,
  type BoqBudgetFilter,
  type BoqGroup,
  type BoqQuery,
} from './records/projectRecords';
import { countCaption } from './records/recordLabels';
import { RecordsSkeleton } from './records/RecordsSkeleton';
import { useResetOnClose } from './records/useRecordsView';

const unitLabel = (unit: string) => BOQ_UNIT_LABELS[unit] || unit;
const BUDGET_LABEL: Record<Exclude<BoqBudgetFilter, 'all'>, string> = {
  over: 'تتجاوز ميزانية المرحلة',
  within: 'ضمن ميزانية المرحلة',
};
const SORT_LABEL: Record<BoqQuery['sort'], string> = { order: 'حسب الإدخال', largest: 'الأكبر قيمة' };

interface BoqSheetProps {
  open: boolean;
  onClose: () => void;
  client: Client;
  phases: ProjectPhase[];
  items: BoqLineItem[];
  /** The three handlers are omitted when this person may not manage project follow-up (`projects.manage`). */
  onAdd?: () => void;
  onEdit?: (item: BoqLineItem) => void;
  onDelete?: (id: string) => void;
  /** True while the records are still arriving: shows a skeleton instead of «no records yet». */
  loading?: boolean;
}

export function BoqSheet({ open, onClose, client, phases, items, onAdd, onEdit, onDelete, loading }: BoqSheetProps) {
  const [query, setQuery] = useState<BoqQuery>(EMPTY_BOQ_QUERY);
  useResetOnClose(open, () => setQuery(EMPTY_BOQ_QUERY));

  const groups = useMemo(() => buildBoqGroups(items, phases, query, unitLabel), [items, phases, query]);
  const facets = useMemo(() => boqFacets(items, phases, query, unitLabel), [items, phases, query]);
  const summary = useMemo(() => summarizeBoq(groups), [groups]);
  const shares = useMemo(
    () => buildShares(summary.phases.map((p) => ({ key: p.key, label: p.title, amount: p.total, count: p.count }))),
    [summary.phases]
  );

  const filtering = query.search.trim() !== '' || query.phases.length > 0 || query.budget !== 'all';
  const patch = (next: Partial<BoqQuery>) => setQuery((q) => ({ ...q, ...next }));
  const clearAll = () => setQuery(EMPTY_BOQ_QUERY);
  const phaseName = (key: string) => facets.phases.find((p) => p.key === key)?.label ?? BOQ_LOOSE_TITLE;

  const active: ActiveFilter[] = [
    ...query.phases.map((key) => ({
      key: `p:${key}`,
      label: `المرحلة: ${phaseName(key)}`,
      onRemove: () => patch({ phases: query.phases.filter((k) => k !== key) }),
    })),
    ...(query.budget !== 'all'
      ? [{ key: 'budget', label: BUDGET_LABEL[query.budget], onRemove: () => patch({ budget: 'all' }) }]
      : []),
    ...(query.sort !== 'order'
      ? [{ key: 'sort', label: `الترتيب: ${SORT_LABEL[query.sort]}`, onRemove: () => patch({ sort: 'order' }) }]
      : []),
  ];

  const budgetOptions = (['over', 'within'] as const).map((key) => ({
    key,
    label: BUDGET_LABEL[key],
    count: facets.budget[key],
    amount: 0,
  }));
  const hasBudgets = items.length > 0 && phases.some((p) => (p.budgetAmount ?? 0) > 0);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="جدول الكميات (BOQ)"
      subtitle={client?.name ? `${client.name} · ${countPhrase('boq', items.length)}` : countPhrase('boq', items.length)}
      maxWidth="lg"
      headerAction={
        items.length > 0 ? (
          <Button
            size="sm"
            variant="outline"
            className="h-11"
            leftIcon={<FileDownload sx={{ fontSize: 18 }} />}
            onClick={() => exportBoqToExcel(client, phases, items)}
          >
            Excel
          </Button>
        ) : undefined
      }
      footer={
        onAdd ? (
          <Button block leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={onAdd}>
            إضافة بند
          </Button>
        ) : undefined
      }
    >
      <div className="min-h-[40vh]">
        {loading && items.length === 0 ? (
          <RecordsSkeleton />
        ) : items.length === 0 ? (
          <div className="px-4 py-5 lg:px-6">
            <EmptyState
              Icon={TableChart}
              title="لا توجد بنود بعد"
              description={
                onAdd
                  ? 'سجّل كل بند من أعمال المشروع بوصفه ووحدته وكميته وسعر وحدته، ويُحسب الإجمالي تلقائياً وتتجمع البنود تحت مراحلها. اضغط إضافة بند للبدء.'
                  : 'لم يُسجَّل أي بند في جدول الكميات بعد.'
              }
            />
          </div>
        ) : (
          <>
            <div className="px-4 pb-3 pt-4 lg:px-6">
              <RecordsSummary
                eyebrow={filtering ? 'إجمالي البنود المطابقة' : 'إجمالي جدول الكميات'}
                figure={<Amount amount={summary.total} />}
                caption={countCaption('boq', filtering ? summary.count : items.length, filtering)}
                context={summary.overCount > 0 ? `فوق ميزانية المرحلة: ${countPhrase('phases', summary.overCount)}` : undefined}
              >
                {shares.length > 1 && <ShareList title="الإجمالي حسب المرحلة" rows={shares} top={4} expandLabel="عرض التفاصيل" />}
              </RecordsSummary>
            </div>

            <RecordsFilterBar
              searchLabel="بحث في جدول الكميات"
              placeholder="ابحث في البنود"
              search={query.search}
              onSearchChange={(search) => patch({ search })}
              active={active}
              onClearAll={clearAll}
              shown={summary.count}
              total={items.length}
            >
              {(facets.phases.length > 1 || query.phases.length > 0) && (
                <FilterGroup title="المرحلة">
                  <MultiChips
                    options={facets.phases}
                    selected={query.phases}
                    onToggle={(key) =>
                      patch({
                        phases: query.phases.includes(key) ? query.phases.filter((k) => k !== key) : [...query.phases, key],
                      })
                    }
                    moreLabel="عرض كل المراحل"
                  />
                </FilterGroup>
              )}
              {hasBudgets && (
                <FilterGroup title="مقارنة بميزانية المرحلة">
                  <SingleChips
                    options={budgetOptions}
                    value={query.budget === 'all' ? '' : query.budget}
                    onChange={(key) => patch({ budget: (key || 'all') as BoqBudgetFilter })}
                    allCount={facets.budget.all}
                  />
                </FilterGroup>
              )}
              <FilterGroup title="الترتيب">
                <Segmented<BoqQuery['sort']>
                  aria-label="ترتيب البنود"
                  value={query.sort}
                  onChange={(sort) => patch({ sort })}
                  options={(Object.keys(SORT_LABEL) as BoqQuery['sort'][]).map((value) => ({ value, label: SORT_LABEL[value] }))}
                />
              </FilterGroup>
            </RecordsFilterBar>

            <div className="space-y-5 px-4 pb-8 pt-1 lg:px-6">
              {groups.length === 0 ? (
                <RecordsNoResults
                  description="لا يوجد بند بهذه الشروط. جرّب كلمة أخرى، أو أزل بعض عناصر التصفية."
                  onReset={clearAll}
                />
              ) : (
                groups.map((group) => (
                  <LedgerGroup
                    key={group.key}
                    sticky={groups.length > 1}
                    title={group.title ?? 'بنود المشروع'}
                    count={countPhrase('boq', group.items.length)}
                    trailing={<Amount amount={group.total} />}
                    note={<BudgetNote group={group} />}
                  >
                    {group.items.map((item) => (
                      <BoqItemRow key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
                    ))}
                  </LedgerGroup>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}

/** How the items of a phase stand against the phase budget; nothing when the phase has none. */
function BudgetNote({ group }: { group: BoqGroup }) {
  if (group.budget === null) return null;
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span>
        ميزانية المرحلة <Amount amount={group.budget} />
      </span>
      {group.budgetState === 'over' ? (
        <Badge tone="danger">
          البنود تتجاوزها بـ <Amount amount={group.overBy} bare />
        </Badge>
      ) : (
        <Badge tone="success">ضمن الميزانية</Badge>
      )}
    </span>
  );
}

function BoqItemRow({
  item,
  onEdit,
  onDelete,
}: {
  item: BoqLineItem;
  onEdit?: (item: BoqLineItem) => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <div className="px-4 pb-3.5 pt-3">
      <div className="flex items-start gap-3">
        <p className="min-w-0 flex-1 pt-2 text-base font-semibold leading-snug text-fg">{item.description}</p>
        {(onEdit || onDelete) && (
          <div className="-me-2 -mt-0.5 flex flex-none">
            {onEdit && (
              <IconButton label={`تعديل ${item.description}`} onClick={() => onEdit(item)}>
                <Edit sx={{ fontSize: 20 }} />
              </IconButton>
            )}
            {onDelete && (
              <IconButton label={`حذف ${item.description}`} onClick={() => onDelete(item.id)}>
                <Delete sx={{ fontSize: 20 }} />
              </IconButton>
            )}
          </div>
        )}
      </div>
      {item.itemCode && <p className="text-xs text-fg-muted">كود {item.itemCode}</p>}
      <div className="mt-1.5 flex items-end justify-between gap-3">
        <p className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm tabular-nums text-fg-subtle">
          <span>
            {formatDecimalNumber(item.quantity)} {unitLabel(item.unit)}
          </span>
          <span aria-hidden>×</span>
          <Amount amount={item.unitPrice} />
        </p>
        <span className="flex-none text-md font-bold tabular-nums text-fg">
          <Amount amount={item.total} />
        </span>
      </div>
      {item.notes && <p className="mt-1 line-clamp-2 text-xs text-fg-muted">{item.notes}</p>}
    </div>
  );
}
