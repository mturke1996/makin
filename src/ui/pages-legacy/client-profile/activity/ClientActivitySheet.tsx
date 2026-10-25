import { useMemo, useState } from 'react';
import { FilterAltOff, History, Search } from '@mui/icons-material';
import { Amount, Button, EmptyState, Sheet } from '../../../../design-system/primitives';
import {
  ACTIVITY_KIND_FILTER_LABEL,
  activityAvailability,
  buildClientActivity,
  countByKind,
  filterActivity,
  groupActivityByMonth,
  monthTitle,
  periodRange,
  todayDay,
  type ActivityAccess,
  type ActivityKind,
  type ActivityMonth,
} from '../../../../core/finance/clientActivity';
import type { Client, Expense, Payment, ProjectPhase, SiteReport, StandaloneDebt, UserBalance } from '../../../../types';
import { ActivityFilterBar } from './ActivityFilterBar';
import { ActivityRow } from './ActivityRow';
import { Figure, MonthSection, RowsSkeleton, ScopeNotes, ShowMore } from './parts';
import { DEFAULT_PERIOD, type PeriodState } from './PeriodFilter';
import { remainingPhrase, useVisibleCount } from './useVisibleCount';

const PAGE = 60;
const ROW_NOUN = { one: 'حركة', two: 'حركتان', few: 'حركات', many: 'حركة' };

const movementsPhrase = (n: number) =>
  n <= 0 ? 'لا حركات بعد' : n === 1 ? 'حركة واحدة' : n === 2 ? 'حركتان' : `${n} ${n <= 10 ? 'حركات' : 'حركة'}`;

/** What the sheet reads of a worker entry: the expenses behind the ledger's payments. */
export interface WorkerPaymentSource {
  ledger: { payments: ReadonlyArray<{ expense: Expense }> };
}

export interface ClientActivitySheetProps {
  open: boolean;
  onClose: () => void;
  client: Pick<Client, 'id' | 'name'>;
  /** What this person may see of the client (`ClientProfileCaps` fits as is). */
  caps: ActivityAccess;
  /** Custody they see: everyone's (`custody.manage`) or only their own. Default: everyone's. */
  custodyScope?: 'all' | 'own';
  /** Already limited to what they may list (everyone's, or only their own). */
  expenses: Expense[];
  /**
   * The client's workers with their ledgers (`data.workerEntries`): every payment they may see through
   * `workers.view` joins the feed even when another person recorded it. Merged with `expenses`, no duplicates.
   */
  workerEntries?: WorkerPaymentSource[];
  payments: Payment[];
  debts: StandaloneDebt[];
  /** Custody deposits on this client (`clientUserBalances`). */
  custodies: UserBalance[];
  siteReports: SiteReport[];
  phases: ProjectPhase[];
  /** The stores are still loading: show placeholders instead of an empty list. */
  loading?: boolean;
  /** A row was tapped. For `worker` the id is the payment's expense id. */
  onOpen: (kind: ActivityKind, id: string) => void;
}

/** One chronological feed of everything on the client, filterable, grouped by month. */
export function ClientActivitySheet(props: ClientActivitySheetProps) {
  // A different client starts with clean filters.
  return <ActivitySheet key={props.client.id} {...props} />;
}

function ActivitySheet({
  open,
  onClose,
  client,
  caps,
  custodyScope,
  expenses,
  workerEntries,
  payments,
  debts,
  custodies,
  siteReports,
  phases,
  loading,
  onOpen,
}: ClientActivitySheetProps) {
  const { expenseScope, payments: canPayments, debts: canDebts, workers, custody, projects } = caps;
  const access = useMemo<ActivityAccess>(
    () => ({ expenseScope, payments: canPayments, debts: canDebts, workers, custody, projects, custodyScope }),
    [expenseScope, canPayments, canDebts, workers, custody, projects, custodyScope],
  );
  const availability = useMemo(() => activityAvailability(access), [access]);
  const workerPayments = useMemo(
    () => workerEntries?.flatMap((entry) => entry.ledger.payments.map((p) => p.expense)),
    [workerEntries],
  );
  const { items, skipped } = useMemo(
    () => buildClientActivity({ expenses, workerPayments, payments, debts, custodies, siteReports, phases }, access),
    [expenses, workerPayments, payments, debts, custodies, siteReports, phases, access],
  );

  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<ActivityKind | 'all'>('all');
  const [period, setPeriod] = useState<PeriodState>(DEFAULT_PERIOD);

  const range = useMemo(
    () => periodRange(period.period, todayDay(), { from: period.from, to: period.to }),
    [period.period, period.from, period.to],
  );
  // Search and period first: the kind chips count what each chip would show right now.
  const scoped = useMemo(() => filterActivity(items, { kinds: [], range, query }), [items, range, query]);
  const counts = useMemo(() => countByKind(scoped), [scoped]);
  const filtered = useMemo(
    () => (kind === 'all' ? scoped : filterActivity(scoped, { kinds: [kind], range: { from: null, to: null }, query: '' })),
    [scoped, kind],
  );
  const months = useMemo(() => groupActivityByMonth(filtered), [filtered]);

  const filtering = query.trim() !== '' || kind !== 'all' || period.period !== 'all';
  const resetKey = `${query}|${kind}|${period.period}|${period.from}|${period.to}`;
  const { count: visible, showMore } = useVisibleCount(resetKey, PAGE);
  const windowed = useMemo(() => {
    let left = visible;
    return months
      .map((m) => {
        const shown = m.items.slice(0, Math.max(0, left));
        left -= shown.length;
        return { month: m, shown };
      })
      .filter((m) => m.shown.length > 0);
  }, [months, visible]);
  const remaining = Math.max(0, filtered.length - visible);

  const chips = availability.kinds.filter((k) => counts[k] > 0 || k === kind);
  const showChips = chips.length >= 2 || kind !== 'all';
  const showNet = availability.netComplete && kind === 'all' && query.trim() === '';
  const ownExpenses = expenseScope === 'own';

  const clearFilters = () => {
    setQuery('');
    setKind('all');
    setPeriod(DEFAULT_PERIOD);
  };

  const figuresOf = (m: ActivityMonth) => {
    if (m.in === 0 && m.out === 0) return null;
    if (showNet) {
      return (
        <Figure label="الصافي">
          <Amount amount={m.net} showSign tone="auto" />
        </Figure>
      );
    }
    return (
      <>
        {access.payments && m.in > 0 && (
          <Figure label="المحصّل">
            <Amount amount={m.in} tone="success" />
          </Figure>
        )}
        {m.out > 0 && (
          <Figure label={ownExpenses ? 'مصروفاتك' : 'المصروف'}>
            <Amount amount={m.out} tone="danger" />
          </Figure>
        )}
      </>
    );
  };

  // With only their own expenses the author is always "you": the line would say nothing.
  const showBy = (rowKind: ActivityKind) => !(rowKind === 'expense' && expenseScope !== 'all');

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="سجل النشاط"
      subtitle={`${client.name} · ${movementsPhrase(items.length)}`}
      maxWidth="md"
    >
      <div className="min-h-[40vh]">
        {(items.length > 0 || loading) && (
          <ActivityFilterBar<ActivityKind>
            query={query}
            onQuery={setQuery}
            period={period}
            onPeriod={setPeriod}
            kind={kind}
            onKind={setKind}
            chips={
              showChips
                ? [
                    { value: 'all', label: 'الكل', count: counts.all },
                    ...chips.map((k) => ({ value: k, label: ACTIVITY_KIND_FILTER_LABEL[k], count: counts[k] })),
                  ]
                : null
            }
          />
        )}

        <div className="space-y-6 px-4 pb-8 pt-1 lg:px-6">
          <ScopeNotes notes={availability.notes} />

          {loading ? (
            <RowsSkeleton />
          ) : items.length === 0 ? (
            <EmptyState
              Icon={History}
              title="لا يوجد نشاط بعد"
              description="كل دفعة ومصروف وعهدة وتقرير يُسجَّل على هذا المشروع يظهر هنا بترتيب زمني."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              Icon={Search}
              title="لا توجد نتائج مطابقة"
              description="جرّب كلمة أخرى، أو وسّع الفترة، أو اعرض كل الأنواع."
              action={
                <Button variant="outline" onClick={clearFilters}>
                  مسح التصفية
                </Button>
              }
            />
          ) : (
            <>
              {filtering && (
                <div className="-mb-3 flex min-h-11 items-center justify-between gap-3 px-1">
                  <p className="text-sm text-fg-subtle">
                    <span className="font-semibold tabular-nums text-fg">{filtered.length}</span> من{' '}
                    <span className="tabular-nums">{items.length}</span>
                  </p>
                  <Button variant="ghost" size="sm" className="min-h-11" leftIcon={<FilterAltOff sx={{ fontSize: 20 }} />} onClick={clearFilters}>
                    مسح التصفية
                  </Button>
                </div>
              )}

              {windowed.map(({ month, shown }) => (
                <MonthSection key={month.key} title={monthTitle(month.key)} figures={figuresOf(month)}>
                  {shown.map((item) => (
                    <ActivityRow key={item.key} item={item} showBy={showBy(item.kind)} onOpen={() => onOpen(item.kind, item.id)} />
                  ))}
                </MonthSection>
              ))}

              {remaining > 0 && (
                <ShowMore label={`عرض المزيد (${remainingPhrase(remaining, ROW_NOUN)})`} onClick={showMore} />
              )}
            </>
          )}

          {skipped > 0 && (
            <p className="px-1 text-xs text-fg-muted">
              {skipped === 1 ? 'سجل واحد بلا تاريخ لم يُعرض.' : `${skipped} سجلات بلا تاريخ لم تُعرض.`}
            </p>
          )}
        </div>
      </div>
    </Sheet>
  );
}
