import type { BoqLineItem, ProjectPhase, SiteReport } from '../../../../types';
import {
  addToFacetEntries,
  buildShares,
  compareRecords,
  dayOf,
  formatDayText,
  matchesSearch,
  monthOf,
  amountSearchText,
  toFacetList,
  type FacetEntry,
  type FacetOption,
  type RecordSort,
} from '../../../../core/finance/clientRecords';
import { fromMilli, toMilli } from '../../../../core/finance/money';
import type { PhaseBudgetRow } from '../../../../core/finance/projectBudget';

/**
 * Filtering and summarising the project follow-up lists of a client (phases, BOQ, site reports).
 * Pure, like `core/finance/clientRecords`: the sheets pass in what the viewer may see and show what
 * comes back, so the summary strip is always the total of the rows underneath it.
 */

/* ── phases ───────────────────────────────────────────────────────────── */

export interface PhaseRow {
  phase: ProjectPhase;
  budget: number;
  /** What was spent on the phase; null when the viewer does not see every expense (no honest figure). */
  actual: number | null;
  /** Budget minus spent (negative when over); null when either side is unknown or there is no budget. */
  remaining: number | null;
  /** Whole percent of the budget spent, not capped; 0 when unknown. */
  usedPercent: number;
  over: boolean;
}

/** One row per phase in the phase order, from the budget rows the profile already computes. */
export function buildPhaseRows(
  phases: readonly ProjectPhase[],
  budgetRows: readonly PhaseBudgetRow[],
  actualKnown: boolean
): PhaseRow[] {
  const byPhase = new Map(budgetRows.map((r) => [r.phase.id, r]));
  return [...phases]
    .sort((a, b) => a.order - b.order)
    .map((phase) => {
      const row = byPhase.get(phase.id);
      const budget = toMilli(row?.budget ?? phase.budgetAmount ?? 0);
      const actual = toMilli(row?.actual ?? 0);
      const over = actualKnown && budget > 0 && actual > budget;
      return {
        phase,
        budget: fromMilli(budget),
        actual: actualKnown ? fromMilli(actual) : null,
        remaining: actualKnown && budget > 0 ? fromMilli(budget - actual) : null,
        usedPercent: actualKnown && budget > 0 ? Math.round((actual * 100) / budget) : 0,
        over,
      };
    });
}

export interface PhaseQuery {
  search: string;
  /** Phase status keys; empty keeps every status. */
  statuses: readonly string[];
  /** Only phases that spent more than their budget. */
  overOnly: boolean;
}

export const EMPTY_PHASE_QUERY: PhaseQuery = { search: '', statuses: [], overOnly: false };

type PhaseFacetName = 'statuses' | 'over';

function phaseMatches(row: PhaseRow, q: PhaseQuery, statusLabel: (status: string) => string, skip?: PhaseFacetName): boolean {
  if (skip !== 'statuses' && q.statuses.length > 0 && !q.statuses.includes(row.phase.status)) return false;
  if (skip !== 'over' && q.overOnly && !row.over) return false;
  return matchesSearch(q.search, () => [row.phase.name, row.phase.notes, statusLabel(row.phase.status)]);
}

export function filterPhaseRows(rows: readonly PhaseRow[], q: PhaseQuery, statusLabel: (status: string) => string): PhaseRow[] {
  return rows.filter((r) => phaseMatches(r, q, statusLabel));
}

export function phaseFacets(
  rows: readonly PhaseRow[],
  q: PhaseQuery,
  statusLabel: (status: string) => string
): { statuses: FacetOption[]; overCount: number } {
  const statuses = new Map<string, FacetEntry>();
  let overCount = 0;
  for (const r of rows) {
    if (phaseMatches(r, q, statusLabel, 'statuses'))
      addToFacetEntries(statuses, r.phase.status, statusLabel(r.phase.status), r.budget);
    if (r.over && phaseMatches(r, q, statusLabel, 'over')) overCount += 1;
  }
  return { statuses: toFacetList(statuses, q.statuses, statusLabel), overCount };
}

export interface PhaseSummary {
  count: number;
  budget: number;
  /** Null when the viewer does not see every expense. */
  actual: number | null;
  /** Budget minus spent over the phases that have a budget; negative when over. Null when unknown. */
  remaining: number | null;
  /** Whole percent of the budgeted phases' budget that is spent. */
  usedPercent: number;
  overCount: number;
  /** Phases in the summary that have no budget set. */
  withoutBudget: number;
}

/**
 * Budget against spending over the phases given. Only phases that have a budget take part in the
 * comparison: spending on a phase with no budget has nothing to be compared with, so it is left out of
 * "remaining" instead of making the whole project look over budget.
 */
export function summarizePhaseRows(rows: readonly PhaseRow[], actualKnown: boolean): PhaseSummary {
  let budget = 0;
  let budgetedBudget = 0;
  let budgetedActual = 0;
  let actual = 0;
  let overCount = 0;
  let withoutBudget = 0;
  for (const r of rows) {
    const b = toMilli(r.budget);
    budget += b;
    if (b <= 0) withoutBudget += 1;
    if (r.actual !== null) {
      const a = toMilli(r.actual);
      actual += a;
      if (b > 0) {
        budgetedBudget += b;
        budgetedActual += a;
      }
    }
    if (r.over) overCount += 1;
  }
  return {
    count: rows.length,
    budget: fromMilli(budget),
    actual: actualKnown ? fromMilli(actual) : null,
    remaining: actualKnown && budgetedBudget > 0 ? fromMilli(budgetedBudget - budgetedActual) : null,
    usedPercent: actualKnown && budgetedBudget > 0 ? Math.round((budgetedActual * 100) / budgetedBudget) : 0,
    overCount,
    withoutBudget,
  };
}

/* ── BOQ ──────────────────────────────────────────────────────────────── */

export type BoqBudgetState = 'over' | 'within' | 'none';
export type BoqBudgetFilter = 'all' | 'over' | 'within';

export interface BoqGroup {
  /** The phase id, or `loose` for items without a phase. */
  key: string;
  phase: ProjectPhase | null;
  /** Null for the one group of a client that has no phases at all (no header needed). */
  title: string | null;
  /** The items that passed the filters. */
  items: BoqLineItem[];
  /** Total of the items that passed the filters. */
  total: number;
  /** Total of every item of the phase, filtered or not: the figure that is compared with the budget. */
  fullTotal: number;
  /** The phase budget; null when the phase has none. */
  budget: number | null;
  budgetState: BoqBudgetState;
  /** How far the phase's items are above its budget (0 unless over). */
  overBy: number;
}

export interface BoqQuery {
  search: string;
  /** Group keys (phase ids or `loose`); empty keeps every phase. */
  phases: readonly string[];
  budget: BoqBudgetFilter;
  sort: 'order' | 'largest';
}

export const EMPTY_BOQ_QUERY: BoqQuery = { search: '', phases: [], budget: 'all', sort: 'order' };

export const BOQ_LOOSE_TITLE = 'بدون مرحلة';

/** Every item of the client in its phase (phase order), items without a known phase last. */
function boqBaseGroups(items: readonly BoqLineItem[], phases: readonly ProjectPhase[]): BoqGroup[] {
  const phaseIds = new Set(phases.map((p) => p.id));
  const byPhase = new Map<string, BoqLineItem[]>();
  const loose: BoqLineItem[] = [];
  for (const item of items) {
    if (item.phaseId && phaseIds.has(item.phaseId)) byPhase.set(item.phaseId, [...(byPhase.get(item.phaseId) ?? []), item]);
    else loose.push(item);
  }
  const make = (key: string, phase: ProjectPhase | null, title: string | null, list: BoqLineItem[]): BoqGroup => {
    const total = list.reduce((s, i) => s + toMilli(i.total), 0);
    const budgetMilli = toMilli(phase?.budgetAmount ?? 0);
    const state: BoqBudgetState = budgetMilli <= 0 ? 'none' : total > budgetMilli ? 'over' : 'within';
    return {
      key,
      phase,
      title,
      items: list,
      total: fromMilli(total),
      fullTotal: fromMilli(total),
      budget: budgetMilli > 0 ? fromMilli(budgetMilli) : null,
      budgetState: state,
      overBy: state === 'over' ? fromMilli(total - budgetMilli) : 0,
    };
  };
  const groups = [...phases]
    .sort((a, b) => a.order - b.order)
    .filter((p) => byPhase.has(p.id))
    .map((p) => make(p.id, p, p.name, byPhase.get(p.id)!));
  if (loose.length > 0) groups.push(make('loose', null, groups.length > 0 ? BOQ_LOOSE_TITLE : null, loose));
  return groups;
}

type BoqFacetName = 'phases' | 'budget';

function boqItemMatches(
  item: BoqLineItem,
  group: BoqGroup,
  q: BoqQuery,
  unitLabel: (unit: string) => string,
  skip?: BoqFacetName
): boolean {
  if (skip !== 'phases' && q.phases.length > 0 && !q.phases.includes(group.key)) return false;
  if (skip !== 'budget' && q.budget !== 'all' && group.budgetState !== q.budget) return false;
  return matchesSearch(q.search, () => [
    item.description,
    item.itemCode,
    item.notes,
    item.category,
    group.title,
    unitLabel(item.unit),
    amountSearchText(item.total),
  ]);
}

/** The groups to show: items that pass the filters, in the order asked for, empty groups dropped. */
export function buildBoqGroups(
  items: readonly BoqLineItem[],
  phases: readonly ProjectPhase[],
  q: BoqQuery,
  unitLabel: (unit: string) => string
): BoqGroup[] {
  return boqBaseGroups(items, phases)
    .map((group) => {
      const kept = group.items.filter((item) => boqItemMatches(item, group, q, unitLabel));
      const ordered =
        q.sort === 'largest' ? [...kept].sort((a, b) => toMilli(b.total) - toMilli(a.total) || a.id.localeCompare(b.id)) : kept;
      return { ...group, items: ordered, total: fromMilli(ordered.reduce((s, i) => s + toMilli(i.total), 0)) };
    })
    .filter((group) => group.items.length > 0);
}

export function boqFacets(
  items: readonly BoqLineItem[],
  phases: readonly ProjectPhase[],
  q: BoqQuery,
  unitLabel: (unit: string) => string
): { phases: FacetOption[]; budget: Record<BoqBudgetFilter, number> } {
  const phaseEntries = new Map<string, FacetEntry>();
  const budget: Record<BoqBudgetFilter, number> = { all: 0, over: 0, within: 0 };
  for (const group of boqBaseGroups(items, phases)) {
    const label = group.title ?? BOQ_LOOSE_TITLE;
    for (const item of group.items) {
      if (boqItemMatches(item, group, q, unitLabel, 'phases')) addToFacetEntries(phaseEntries, group.key, label, item.total);
      if (boqItemMatches(item, group, q, unitLabel, 'budget')) {
        budget.all += 1;
        if (group.budgetState === 'over') budget.over += 1;
        if (group.budgetState === 'within') budget.within += 1;
      }
    }
  }
  return {
    phases: toFacetList(phaseEntries, q.phases, (key) =>
      key === 'loose' ? BOQ_LOOSE_TITLE : (phases.find((p) => p.id === key)?.name ?? key)
    ),
    budget,
  };
}

export interface BoqPhaseShare {
  key: string;
  title: string;
  count: number;
  total: number;
  /** Whole percent of the filtered total; the percents add up to 100. */
  percent: number;
  budget: number | null;
  budgetState: BoqBudgetState;
  overBy: number;
}

export interface BoqSummary {
  count: number;
  total: number;
  phases: BoqPhaseShare[];
  overCount: number;
}

export function summarizeBoq(groups: readonly BoqGroup[]): BoqSummary {
  const shares = new Map(
    buildShares(
      groups.map((g) => ({ key: g.key, label: g.title ?? BOQ_LOOSE_TITLE, amount: g.total, count: g.items.length }))
    ).map((s) => [s.key, s.percent])
  );
  return {
    count: groups.reduce((s, g) => s + g.items.length, 0),
    total: fromMilli(groups.reduce((s, g) => s + toMilli(g.total), 0)),
    phases: groups.map((g) => ({
      key: g.key,
      title: g.title ?? BOQ_LOOSE_TITLE,
      count: g.items.length,
      total: g.total,
      percent: shares.get(g.key) ?? 0,
      budget: g.budget,
      budgetState: g.budgetState,
      overBy: g.overBy,
    })),
    overCount: groups.filter((g) => g.budgetState === 'over').length,
  };
}

/* ── site reports ─────────────────────────────────────────────────────── */

export type ReportProgressFilter = 'all' | 'under50' | 'from50' | 'none';

export interface ReportQuery {
  search: string;
  /** `YYYY-MM`, or empty for every month. */
  month: string;
  progress: ReportProgressFilter;
  /** Only reports that mention a problem. */
  issuesOnly: boolean;
  sort: Exclude<RecordSort, 'largest'>;
}

export const EMPTY_REPORT_QUERY: ReportQuery = { search: '', month: '', progress: 'all', issuesOnly: false, sort: 'newest' };

const hasProgress = (r: Pick<SiteReport, 'progressPercent'>): r is { progressPercent: number } =>
  typeof r.progressPercent === 'number' && Number.isFinite(r.progressPercent);

export function reportProgressBand(r: Pick<SiteReport, 'progressPercent'>): Exclude<ReportProgressFilter, 'all'> {
  if (!hasProgress(r)) return 'none';
  return r.progressPercent < 50 ? 'under50' : 'from50';
}

const hasIssues = (r: Pick<SiteReport, 'issues'>) => !!r.issues?.trim();

type ReportFacetName = 'months' | 'progress' | 'issues';

function reportMatches(r: SiteReport, q: ReportQuery, skip?: ReportFacetName): boolean {
  if (skip !== 'months' && q.month && monthOf(r.reportDate) !== q.month) return false;
  if (skip !== 'progress' && q.progress !== 'all' && reportProgressBand(r) !== q.progress) return false;
  if (skip !== 'issues' && q.issuesOnly && !hasIssues(r)) return false;
  return matchesSearch(q.search, () => [
    r.title,
    r.workCompleted,
    r.issues,
    r.nextSteps,
    r.notes,
    r.weather,
    r.createdBy,
    formatDayText(r.reportDate),
  ]);
}

export function sortReports(list: readonly SiteReport[], sort: ReportQuery['sort']): SiteReport[] {
  return [...list].sort(
    compareRecords<SiteReport>(
      sort,
      (r) => dayOf(r.reportDate),
      () => 0
    )
  );
}

export function filterReports(list: readonly SiteReport[], q: ReportQuery): SiteReport[] {
  return sortReports(
    list.filter((r) => reportMatches(r, q)),
    q.sort
  );
}

export function reportFacets(
  list: readonly SiteReport[],
  q: ReportQuery
): { months: FacetOption[]; progress: Record<ReportProgressFilter, number>; issues: number } {
  const months = new Map<string, FacetEntry>();
  const progress: Record<ReportProgressFilter, number> = { all: 0, under50: 0, from50: 0, none: 0 };
  let issues = 0;
  for (const r of list) {
    const month = monthOf(r.reportDate);
    if (month && reportMatches(r, q, 'months')) addToFacetEntries(months, month, month, 0);
    if (reportMatches(r, q, 'progress')) {
      progress.all += 1;
      progress[reportProgressBand(r)] += 1;
    }
    if (hasIssues(r) && reportMatches(r, q, 'issues')) issues += 1;
  }
  return {
    months: toFacetList(months, q.month ? [q.month] : [], (key) => key).sort((a, b) => (a.key < b.key ? 1 : -1)),
    progress,
    issues,
  };
}

export interface ReportSummary {
  count: number;
  /** Progress of the newest report that states one; null when none does. */
  latestProgress: number | null;
  /** Points gained since the oldest report that states one; null with fewer than two such reports. */
  progressChange: number | null;
  issuesCount: number;
  /** Most workers on site in one report; null when no report counts them. */
  peakWorkers: number | null;
}

export function summarizeReports(list: readonly SiteReport[]): ReportSummary {
  const dated = sortReports(list, 'newest').filter(hasProgress);
  const latest = dated[0]?.progressPercent ?? null;
  const first = dated.length >= 2 ? dated[dated.length - 1].progressPercent : null;
  const workers = list.map((r) => r.workersOnSite).filter((n): n is number => typeof n === 'number' && n > 0);
  return {
    count: list.length,
    latestProgress: latest,
    progressChange: latest !== null && first !== null ? latest - first : null,
    issuesCount: list.filter(hasIssues).length,
    peakWorkers: workers.length > 0 ? Math.max(...workers) : null,
  };
}
