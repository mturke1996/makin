import { useDeferredValue, useMemo, useState } from 'react';
import { Add, AttachFile, Edit, Delete, Engineering, ExpandMore, WarningAmber } from '@mui/icons-material';
import { Button, EmptyState, IconButton, ProgressBar, Segmented, Sheet } from '../../../design-system/primitives';
import { cn } from '../../../design-system/primitives/cn';
import { formatDayText, groupRecords, limitGroups } from '../../../core/finance/clientRecords';
import type { Client, SiteReport } from '../../../types';
import { monthKeyLabel } from './ledgerUtils';
import { LedgerGroup } from './LedgerParts';
import { countPhrase } from './moduleCopy';
import { FilterChip, FilterGroup, SingleChips } from './records/filterControls';
import { groupTitle, RecordsNoResults, ShowMore } from './records/RecordsList';
import { RecordsFilterBar, type ActiveFilter } from './records/RecordsFilterBar';
import { RecordsSummary } from './records/RecordsSummary';
import {
  EMPTY_REPORT_QUERY,
  filterReports,
  reportFacets,
  summarizeReports,
  type ReportProgressFilter,
  type ReportQuery,
} from './records/projectRecords';
import { countCaption } from './records/recordLabels';
import { RecordsSkeleton } from './records/RecordsSkeleton';
import { usePagedLimit, useResetOnClose } from './records/useRecordsView';

const PROGRESS_LABEL: Record<Exclude<ReportProgressFilter, 'all'>, string> = {
  under50: 'أقل من 50%',
  from50: '50% فأكثر',
  none: 'بلا نسبة إنجاز',
};
const SORT_LABEL: Record<ReportQuery['sort'], string> = { newest: 'الأحدث', oldest: 'الأقدم' };

interface SiteReportsSheetProps {
  open: boolean;
  onClose: () => void;
  client: Client;
  reports: SiteReport[];
  /** The three handlers are omitted when this person may not manage project follow-up (`projects.manage`). */
  onAdd?: () => void;
  onEdit?: (report: SiteReport) => void;
  onDelete?: (id: string) => void;
  /** True while the records are still arriving: shows a skeleton instead of «no records yet». */
  loading?: boolean;
}

export function SiteReportsSheet({ open, onClose, client, reports, onAdd, onEdit, onDelete, loading }: SiteReportsSheetProps) {
  const [query, setQuery] = useState<ReportQuery>(EMPTY_REPORT_QUERY);
  useResetOnClose(open, () => setQuery(EMPTY_REPORT_QUERY));

  const deferredSearch = useDeferredValue(query.search);
  const effective = useMemo(() => ({ ...query, search: deferredSearch }), [query, deferredSearch]);
  const filtered = useMemo(() => filterReports(reports, effective), [reports, effective]);
  const facets = useMemo(() => reportFacets(reports, effective), [reports, effective]);
  const summary = useMemo(() => summarizeReports(filtered), [filtered]);
  // The progress of the project is the newest report that states one, however the list is filtered.
  const overall = useMemo(() => summarizeReports(reports), [reports]);

  const groups = useMemo(
    () =>
      groupRecords(
        filtered,
        (r) => r.reportDate,
        () => 0,
        'month'
      ),
    [filtered]
  );
  const { limit, more } = usePagedLimit(JSON.stringify(effective));
  const page = useMemo(() => limitGroups(groups, limit), [groups, limit]);

  const filtering = query.search.trim() !== '' || query.month !== '' || query.progress !== 'all' || query.issuesOnly;
  const patch = (next: Partial<ReportQuery>) => setQuery((q) => ({ ...q, ...next }));
  const clearAll = () => setQuery(EMPTY_REPORT_QUERY);

  const active: ActiveFilter[] = [
    ...(query.month
      ? [{ key: 'month', label: `الشهر: ${monthKeyLabel(query.month)}`, onRemove: () => patch({ month: '' }) }]
      : []),
    ...(query.progress !== 'all'
      ? [{ key: 'progress', label: `الإنجاز: ${PROGRESS_LABEL[query.progress]}`, onRemove: () => patch({ progress: 'all' }) }]
      : []),
    ...(query.issuesOnly ? [{ key: 'issues', label: 'فيها مشاكل', onRemove: () => patch({ issuesOnly: false }) }] : []),
    ...(query.sort !== 'newest'
      ? [{ key: 'sort', label: `الترتيب: ${SORT_LABEL[query.sort]}`, onRemove: () => patch({ sort: 'newest' }) }]
      : []),
  ];
  const monthOptions = facets.months.map((m) => ({ ...m, label: monthKeyLabel(m.key) }));
  const progressOptions = (Object.keys(PROGRESS_LABEL) as (keyof typeof PROGRESS_LABEL)[]).map((key) => ({
    key,
    label: PROGRESS_LABEL[key],
    count: facets.progress[key],
    amount: 0,
  }));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="تقارير الموقع"
      subtitle={
        client?.name ? `${client.name} · ${countPhrase('reports', reports.length)}` : countPhrase('reports', reports.length)
      }
      maxWidth="lg"
      footer={
        onAdd ? (
          <Button block leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={onAdd}>
            إضافة تقرير
          </Button>
        ) : undefined
      }
    >
      <div className="min-h-[40vh]">
        {loading && reports.length === 0 ? (
          <RecordsSkeleton />
        ) : reports.length === 0 ? (
          <div className="px-4 py-5 lg:px-6">
            <EmptyState
              Icon={Engineering}
              title="لا توجد تقارير بعد"
              description={
                onAdd
                  ? 'سجّل يوميات الموقع: ما تم إنجازه، عدد العمال، نسبة الإنجاز وأي مشاكل أو تأخير، وتظهر هنا مرتبة بالأشهر. اضغط إضافة تقرير للبدء.'
                  : 'لم يُسجَّل أي تقرير للموقع بعد.'
              }
            />
          </div>
        ) : (
          <>
            <div className="px-4 pb-3 pt-4 lg:px-6">
              <RecordsSummary
                eyebrow={overall.latestProgress !== null ? 'آخر نسبة إنجاز للمشروع' : 'تقارير الموقع'}
                tone="brand"
                figure={
                  overall.latestProgress !== null ? (
                    <bdi dir="ltr">{overall.latestProgress}%</bdi>
                  ) : (
                    <span className="text-base">لا نسبة إنجاز مسجّلة بعد</span>
                  )
                }
                caption={countCaption('reports', filtering ? summary.count : reports.length, filtering)}
                context={
                  overall.progressChange !== null && overall.progressChange > 0 ? (
                    <>
                      ارتفعت <bdi dir="ltr">{overall.progressChange}</bdi> نقطة منذ أول تقرير
                    </>
                  ) : undefined
                }
                meter={
                  overall.latestProgress !== null ? (
                    <ProgressBar value={overall.latestProgress} label="آخر نسبة إنجاز للمشروع" />
                  ) : undefined
                }
                stats={[
                  { label: 'تقارير فيها مشاكل', value: <bdi dir="ltr">{summary.issuesCount}</bdi> },
                  {
                    label: 'أكثر عمال في الموقع',
                    value:
                      summary.peakWorkers !== null || summary.count === 0 ? (
                        <bdi dir="ltr">{summary.peakWorkers ?? 0}</bdi>
                      ) : (
                        <span className="text-fg-muted">غير مسجّل</span>
                      ),
                  },
                ]}
              />
            </div>

            <RecordsFilterBar
              searchLabel="بحث في تقارير الموقع"
              placeholder="ابحث في التقارير"
              search={query.search}
              onSearchChange={(search) => patch({ search })}
              active={active}
              onClearAll={clearAll}
              shown={filtered.length}
              total={reports.length}
            >
              {(monthOptions.length > 1 || query.month !== '') && (
                <FilterGroup title="الشهر">
                  <SingleChips
                    scroll
                    options={monthOptions}
                    value={query.month}
                    onChange={(month) => patch({ month })}
                    allLabel="كل الأشهر"
                  />
                </FilterGroup>
              )}
              <FilterGroup title="نسبة الإنجاز">
                <SingleChips
                  options={progressOptions}
                  value={query.progress === 'all' ? '' : query.progress}
                  onChange={(key) => patch({ progress: (key || 'all') as ReportProgressFilter })}
                  allCount={facets.progress.all}
                />
              </FilterGroup>
              {(facets.issues > 0 || query.issuesOnly) && (
                <FilterGroup title="المشاكل">
                  <FilterChip
                    selected={query.issuesOnly}
                    count={facets.issues}
                    onClick={() => patch({ issuesOnly: !query.issuesOnly })}
                  >
                    فيها مشاكل
                  </FilterChip>
                </FilterGroup>
              )}
              <FilterGroup title="الترتيب">
                <Segmented<ReportQuery['sort']>
                  aria-label="ترتيب التقارير"
                  value={query.sort}
                  onChange={(sort) => patch({ sort })}
                  options={(Object.keys(SORT_LABEL) as ReportQuery['sort'][]).map((value) => ({
                    value,
                    label: SORT_LABEL[value],
                  }))}
                />
              </FilterGroup>
            </RecordsFilterBar>

            <div className="space-y-5 px-4 pb-8 pt-1 lg:px-6">
              {filtered.length === 0 ? (
                <RecordsNoResults
                  description="لا يوجد تقرير بهذه الشروط. جرّب كلمة أخرى، أو أزل بعض عناصر التصفية."
                  onReset={clearAll}
                />
              ) : (
                page.groups.map((group) => (
                  <LedgerGroup key={group.key} sticky title={groupTitle(group)} count={countPhrase('reports', group.count)}>
                    {group.items.map((r) => (
                      <ReportItem key={r.id} report={r} onEdit={onEdit} onDelete={onDelete} />
                    ))}
                  </LedgerGroup>
                ))
              )}
              <ShowMore hidden={page.hidden} onMore={more} />
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}

/** One site report. The work and the problems are clamped in the list; «عرض التفاصيل» opens everything it holds. */
function ReportItem({
  report: r,
  onEdit,
  onDelete,
}: {
  report: SiteReport;
  onEdit?: (report: SiteReport) => void;
  onDelete?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = [
    formatDayText(r.reportDate),
    r.weather || null,
    r.workersOnSite ? countPhrase('workers', r.workersOnSite) : null,
  ].filter(Boolean);
  const hasMore = !!(r.nextSteps || r.notes || r.attachmentUrl || r.workCompleted.length > 120 || (r.issues?.length ?? 0) > 100);

  return (
    <div className="px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-snug text-fg">{r.title}</h3>
          <p className="mt-0.5 text-xs tabular-nums text-fg-muted">{meta.join(' · ')}</p>
        </div>
        {(onEdit || onDelete) && (
          <div className="-me-2 flex flex-none">
            {onEdit && (
              <IconButton label={`تعديل ${r.title}`} onClick={() => onEdit(r)}>
                <Edit sx={{ fontSize: 20 }} />
              </IconButton>
            )}
            {onDelete && (
              <IconButton label={`حذف ${r.title}`} onClick={() => onDelete(r.id)}>
                <Delete sx={{ fontSize: 20 }} />
              </IconButton>
            )}
          </div>
        )}
      </div>

      {r.progressPercent != null && (
        <div className="mt-3 flex items-center gap-3">
          <ProgressBar value={r.progressPercent} label={`نسبة الإنجاز في ${r.title}`} />
          <span className="flex-none text-xs font-semibold tabular-nums text-fg-subtle">
            إنجاز <bdi dir="ltr">{r.progressPercent}%</bdi>
          </span>
        </div>
      )}

      <p className={cn('mt-3 whitespace-pre-line text-sm leading-relaxed text-fg-subtle', !expanded && 'line-clamp-3')}>
        {r.workCompleted}
      </p>

      {r.issues && (
        <p className="mt-3 flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-xs leading-relaxed text-warning-ink">
          <WarningAmber sx={{ fontSize: 18 }} aria-hidden className="mt-px flex-none" />
          <span className={cn('whitespace-pre-line', !expanded && 'line-clamp-2')}>
            <span className="font-semibold">مشاكل:</span> {r.issues}
          </span>
        </p>
      )}

      {expanded && (
        <dl className="mt-3 space-y-2.5 text-sm">
          {r.nextSteps && (
            <div>
              <dt className="text-2xs text-fg-muted">الخطوات القادمة</dt>
              <dd className="mt-0.5 whitespace-pre-line leading-relaxed text-fg-subtle">{r.nextSteps}</dd>
            </div>
          )}
          {r.notes && (
            <div>
              <dt className="text-2xs text-fg-muted">ملاحظات</dt>
              <dd className="mt-0.5 whitespace-pre-line leading-relaxed text-fg-subtle">{r.notes}</dd>
            </div>
          )}
          {r.createdBy && (
            <div>
              <dt className="text-2xs text-fg-muted">سجّله</dt>
              <dd className="mt-0.5 text-fg-subtle">{r.createdBy}</dd>
            </div>
          )}
          {r.attachmentUrl && (
            <a
              href={r.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-semibold text-accent-ink hover:underline focus:outline-none focus-visible:shadow-focus"
            >
              <AttachFile aria-hidden sx={{ fontSize: 18 }} />
              عرض {r.attachmentName || 'المرفق'}
            </a>
          )}
        </dl>
      )}

      {hasMore && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="-mb-2 mt-1 inline-flex min-h-11 items-center gap-1 rounded-md pe-2 text-sm font-semibold text-accent-ink focus:outline-none focus-visible:shadow-focus"
        >
          {expanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
          <ExpandMore
            sx={{ fontSize: 20 }}
            aria-hidden
            className={cn('transition-transform duration-base ease-out', expanded && 'rotate-180')}
          />
        </button>
      )}
    </div>
  );
}
