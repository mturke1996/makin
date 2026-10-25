import { useMemo, useState } from 'react';
import { Add, Edit, Delete, Timeline, FileDownload } from '../../../design-system/icons';
import { Amount, Badge, Button, EmptyState, IconButton, ListGroup, ProgressBar, Sheet } from '../../../design-system/primitives';
import { formatDayText } from '../../../core/finance/clientRecords';
import { exportPhaseBudgetToExcel, PHASE_STATUS_LABELS } from '../../../features/export/excelExport';
import type { Client, ProjectPhase } from '../../../types';
import type { PhaseBudgetRow } from '../../../core/finance/projectBudget';
import { countPhrase } from './moduleCopy';
import { FilterChip, FilterGroup, MultiChips } from './records/filterControls';
import { RecordsNoResults } from './records/RecordsList';
import { RecordsFilterBar, type ActiveFilter } from './records/RecordsFilterBar';
import { RecordsSummary } from './records/RecordsSummary';
import {
  EMPTY_PHASE_QUERY,
  buildPhaseRows,
  filterPhaseRows,
  phaseFacets,
  summarizePhaseRows,
  type PhaseQuery,
  type PhaseRow,
} from './records/projectRecords';
import { countCaption } from './records/recordLabels';
import { RecordsSkeleton } from './records/RecordsSkeleton';
import { useResetOnClose } from './records/useRecordsView';
import { PhaseTemplateSheet } from './PhaseTemplateSheet';

const STATUS_TONE: Record<string, 'info' | 'warning' | 'success' | 'neutral'> = {
  planned: 'info',
  in_progress: 'warning',
  completed: 'success',
  on_hold: 'neutral',
};

const statusLabel = (status: string) => PHASE_STATUS_LABELS[status] || status;

function phaseDates(p: ProjectPhase): string {
  const start = formatDayText(p.startDate);
  const end = formatDayText(p.endDate);
  if (start && end) return `من ${start} إلى ${end}`;
  if (start) return `تبدأ ${start}`;
  if (end) return `تنتهي ${end}`;
  return '';
}

interface PhasesSheetProps {
  open: boolean;
  onClose: () => void;
  client: Client;
  phases: ProjectPhase[];
  budgetRows: PhaseBudgetRow[];
  /**
   * The spent side of the budget is a real figure only for someone who sees every expense. For anyone
   * else the sheet shows the budget alone instead of comparing it with a partial total.
   */
  actualKnown: boolean;
  /** The three handlers are omitted when this person may not manage project follow-up (`projects.manage`). */
  onAdd?: () => void;
  onEdit?: (phase: ProjectPhase) => void;
  onDelete?: (id: string) => void;
  /** True while the records are still arriving: shows a skeleton instead of «no records yet». */
  loading?: boolean;
}

export function PhasesSheet({
  open,
  onClose,
  client,
  phases,
  budgetRows,
  actualKnown,
  onAdd,
  onEdit,
  onDelete,
  loading,
}: PhasesSheetProps) {
  const [query, setQuery] = useState<PhaseQuery>(EMPTY_PHASE_QUERY);
  const [showTemplates, setShowTemplates] = useState(false);
  useResetOnClose(open, () => { setQuery(EMPTY_PHASE_QUERY); setShowTemplates(false); });

  const rows = useMemo(() => buildPhaseRows(phases, budgetRows, actualKnown), [phases, budgetRows, actualKnown]);
  const filtered = useMemo(() => filterPhaseRows(rows, query, statusLabel), [rows, query]);
  const facets = useMemo(() => phaseFacets(rows, query, statusLabel), [rows, query]);
  const summary = useMemo(() => summarizePhaseRows(filtered, actualKnown), [filtered, actualKnown]);

  const filtering = query.search.trim() !== '' || query.statuses.length > 0 || query.overOnly;
  const patch = (next: Partial<PhaseQuery>) => setQuery((q) => ({ ...q, ...next }));
  const clearAll = () => setQuery(EMPTY_PHASE_QUERY);

  const active: ActiveFilter[] = [
    ...query.statuses.map((key) => ({
      key: `s:${key}`,
      label: `الحالة: ${statusLabel(key)}`,
      onRemove: () => patch({ statuses: query.statuses.filter((k) => k !== key) }),
    })),
    ...(query.overOnly ? [{ key: 'over', label: 'تجاوزت الميزانية', onRemove: () => patch({ overOnly: false }) }] : []),
  ];

  const overspent = summary.remaining !== null && summary.remaining < 0;

  return (
    <>
    <Sheet
      open={open}
      onClose={onClose}
      title="مراحل المشروع"
      subtitle={client?.name ? `${client.name} · ${countPhrase('phases', phases.length)}` : countPhrase('phases', phases.length)}
      maxWidth="lg"
      headerAction={
        budgetRows.length > 0 && actualKnown ? (
          <Button
            size="sm"
            variant="outline"
            className="h-11"
            leftIcon={<FileDownload sx={{ fontSize: 18 }} />}
            onClick={() => exportPhaseBudgetToExcel(client, budgetRows)}
          >
            Excel
          </Button>
        ) : undefined
      }
      footer={
        onAdd ? (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setShowTemplates(true)} disabled={loading}>قالب جاهز</Button>
            <Button leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={onAdd}>إضافة مرحلة</Button>
          </div>
        ) : undefined
      }
    >
      <div className="min-h-[40vh]">
        {loading && phases.length === 0 ? (
          <RecordsSkeleton />
        ) : phases.length === 0 ? (
          <div className="px-4 py-5 lg:px-6">
            <EmptyState
              Icon={Timeline}
              title="لا توجد مراحل بعد"
              description={
                onAdd
                  ? 'قسّم المشروع إلى مراحل مثل الأساسات والهيكل والتشطيب، وحدّد ميزانية كل مرحلة لتقارن بها المصروف الفعلي. اضغط إضافة مرحلة للبدء.'
                  : 'لم تُحدَّد أي مرحلة لهذا المشروع بعد.'
              }
            />
          </div>
        ) : (
          <>
            <div className="px-4 pb-3 pt-4 lg:px-6">
              <RecordsSummary
                eyebrow={filtering ? 'ميزانية المراحل المطابقة' : 'إجمالي ميزانية المراحل'}
                figure={<Amount amount={summary.budget} />}
                caption={countCaption('phases', filtering ? summary.count : phases.length, filtering)}
                partialNote={
                  actualKnown ? undefined : 'المصروف الفعلي لا يظهر لك لأن مقارنته بالميزانية تحتاج رؤية كل مصروفات المشروع.'
                }
                stats={
                  actualKnown
                    ? [
                        { label: 'المصروف الفعلي', value: <Amount amount={summary.actual ?? 0} /> },
                        {
                          label: overspent ? 'تجاوز الميزانية' : 'المتبقي من الميزانية',
                          value:
                            summary.remaining === null ? (
                              <span className="text-fg-muted">بلا ميزانية</span>
                            ) : (
                              <Amount amount={Math.abs(summary.remaining)} tone={overspent ? 'danger' : 'inherit'} />
                            ),
                        },
                      ]
                    : undefined
                }
              >
                {actualKnown && summary.remaining !== null && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <ProgressBar
                        value={summary.usedPercent}
                        tone={overspent ? 'danger' : summary.usedPercent >= 85 ? 'warning' : 'brand'}
                        label="استهلاك ميزانية المراحل"
                      />
                      <span className="flex-none text-xs font-semibold tabular-nums text-fg-subtle">
                        استُهلك <bdi dir="ltr">{summary.usedPercent}%</bdi>
                      </span>
                    </div>
                    {(summary.overCount > 0 || summary.withoutBudget > 0) && (
                      <p className="text-xs text-fg-muted">
                        {summary.overCount > 0 && (
                          <span className="font-semibold text-danger-ink">
                            تجاوز الميزانية: {countPhrase('phases', summary.overCount)}
                          </span>
                        )}
                        {summary.overCount > 0 && summary.withoutBudget > 0 && ' · '}
                        {summary.withoutBudget > 0 && `بلا ميزانية: ${countPhrase('phases', summary.withoutBudget)}`}
                      </p>
                    )}
                  </div>
                )}
              </RecordsSummary>
            </div>

            <RecordsFilterBar
              searchLabel="بحث في المراحل"
              placeholder="ابحث في المراحل"
              search={query.search}
              onSearchChange={(search) => patch({ search })}
              active={active}
              onClearAll={clearAll}
              shown={filtered.length}
              total={phases.length}
            >
              {(facets.statuses.length > 1 || query.statuses.length > 0) && (
                <FilterGroup title="حالة المرحلة">
                  <MultiChips
                    options={facets.statuses}
                    selected={query.statuses}
                    onToggle={(key) =>
                      patch({
                        statuses: query.statuses.includes(key)
                          ? query.statuses.filter((k) => k !== key)
                          : [...query.statuses, key],
                      })
                    }
                    moreLabel="عرض كل الحالات"
                  />
                </FilterGroup>
              )}
              {actualKnown && (facets.overCount > 0 || query.overOnly) && (
                <FilterGroup title="الميزانية">
                  <FilterChip
                    selected={query.overOnly}
                    count={facets.overCount}
                    onClick={() => patch({ overOnly: !query.overOnly })}
                  >
                    تجاوزت الميزانية
                  </FilterChip>
                </FilterGroup>
              )}
            </RecordsFilterBar>

            <div className="space-y-5 px-4 pb-8 pt-3 lg:px-6">
              {filtered.length === 0 ? (
                <RecordsNoResults
                  description="لا توجد مرحلة بهذه الشروط. جرّب كلمة أخرى، أو أزل بعض عناصر التصفية."
                  onReset={clearAll}
                />
              ) : (
                <ListGroup>
                  {filtered.map((row) => (
                    <PhaseItem key={row.phase.id} row={row} actualKnown={actualKnown} onEdit={onEdit} onDelete={onDelete} />
                  ))}
                </ListGroup>
              )}
            </div>
          </>
        )}
      </div>
    </Sheet>
    {open && showTemplates && onAdd && <PhaseTemplateSheet client={client} phases={phases} onClose={() => setShowTemplates(false)} />}
    </>
  );
}

function PhaseItem({
  row,
  actualKnown,
  onEdit,
  onDelete,
}: {
  row: PhaseRow;
  actualKnown: boolean;
  onEdit?: (phase: ProjectPhase) => void;
  onDelete?: (id: string) => void;
}) {
  const { phase, over } = row;
  const dates = phaseDates(phase);
  const hasBudget = row.budget > 0;

  return (
    <div className="px-4 py-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid size-9 flex-none place-items-center rounded-md bg-surface-sunken text-sm font-bold tabular-nums text-fg-subtle"
        >
          {phase.order}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-snug text-fg">{phase.name}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge dot tone={STATUS_TONE[phase.status] || 'neutral'}>
              {statusLabel(phase.status)}
            </Badge>
            {over && <Badge tone="danger">تجاوز الميزانية</Badge>}
          </div>
          {dates && <p className="mt-2 text-xs tabular-nums text-fg-muted">{dates}</p>}
          {phase.notes && <p className="mt-1 line-clamp-2 text-xs text-fg-subtle">{phase.notes}</p>}
        </div>
        {(onEdit || onDelete) && (
          <div className="-me-2 flex flex-none">
            {onEdit && (
              <IconButton label={`تعديل ${phase.name}`} onClick={() => onEdit(phase)}>
                <Edit sx={{ fontSize: 20 }} />
              </IconButton>
            )}
            {onDelete && (
              <IconButton label={`حذف ${phase.name}`} onClick={() => onDelete(phase.id)}>
                <Delete sx={{ fontSize: 20 }} />
              </IconButton>
            )}
          </div>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(6.25rem,1fr))] gap-x-3 gap-y-2.5">
        <div className="min-w-0">
          <dt className="text-2xs text-fg-muted">الميزانية</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-fg">
            {hasBudget ? <Amount amount={row.budget} /> : <span className="text-fg-muted">بلا ميزانية</span>}
          </dd>
        </div>
        {actualKnown && (
          <>
            <div className="min-w-0">
              <dt className="text-2xs text-fg-muted">المصروف</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums text-fg">
                <Amount amount={row.actual ?? 0} tone={over ? 'danger' : 'inherit'} />
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-2xs text-fg-muted">{over ? 'التجاوز' : 'المتبقي'}</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums text-fg">
                {row.remaining === null ? (
                  <span className="text-fg-muted">لا مقارنة</span>
                ) : (
                  <Amount amount={Math.abs(row.remaining)} tone={over ? 'danger' : 'inherit'} />
                )}
              </dd>
            </div>
          </>
        )}
      </dl>

      {actualKnown && hasBudget && (
        <div className="mt-3 flex items-center gap-3">
          <ProgressBar
            value={row.usedPercent}
            tone={over ? 'danger' : row.usedPercent >= 85 ? 'warning' : 'brand'}
            label={`استهلاك ميزانية ${phase.name}`}
          />
          <span className="flex-none text-xs font-semibold tabular-nums text-fg-subtle">
            <bdi dir="ltr">{row.usedPercent}%</bdi>
          </span>
        </div>
      )}
    </div>
  );
}
