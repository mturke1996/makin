import { describe, expect, it } from 'vitest';
import type { BoqLineItem, ProjectPhase, SiteReport } from '../../../../types';
import type { PhaseBudgetRow } from '../../../../core/finance/projectBudget';
import {
  BOQ_LOOSE_TITLE,
  EMPTY_BOQ_QUERY,
  EMPTY_PHASE_QUERY,
  EMPTY_REPORT_QUERY,
  boqFacets,
  buildBoqGroups,
  buildPhaseRows,
  filterPhaseRows,
  filterReports,
  phaseFacets,
  reportFacets,
  reportProgressBand,
  summarizeBoq,
  summarizePhaseRows,
  summarizeReports,
} from './projectRecords';

const STATUS: Record<string, string> = { planned: 'مخطط', in_progress: 'قيد التنفيذ', completed: 'مكتمل', on_hold: 'متوقف' };
const statusLabel = (s: string) => STATUS[s] ?? s;
const unitLabel = (u: string) => ({ m3: 'م³', ton: 'طن' })[u] ?? u;

const phase = (id: string, order: number, over: Partial<ProjectPhase> = {}): ProjectPhase => ({
  id,
  clientId: 'c1',
  name: `مرحلة ${id}`,
  order,
  status: 'planned',
  budgetAmount: 1000,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});
const budgetRow = (p: ProjectPhase, actual: number): PhaseBudgetRow => ({
  phase: p,
  budget: p.budgetAmount ?? 0,
  actual,
  variance: (p.budgetAmount ?? 0) - actual,
  pctUsed: 0,
});

describe('phase rows', () => {
  const ph1 = phase('ph1', 2, { name: 'الهيكل الخرساني', status: 'in_progress', budgetAmount: 65000, notes: 'الدور الأول' });
  const ph2 = phase('ph2', 1, { name: 'الحفر والأساسات', status: 'completed', budgetAmount: 40000 });
  const ph3 = phase('ph3', 3, { name: 'التشطيبات', status: 'planned', budgetAmount: undefined });
  const rows = (known: boolean) =>
    buildPhaseRows([ph1, ph2, ph3], [budgetRow(ph1, 70000), budgetRow(ph2, 38000.5), budgetRow(ph3, 250)], known);

  it('lists the phases in their order and flags the ones over budget', () => {
    const r = rows(true);
    expect(r.map((x) => x.phase.id)).toEqual(['ph2', 'ph1', 'ph3']);
    expect(r[1]).toMatchObject({ budget: 65000, actual: 70000, remaining: -5000, usedPercent: 108, over: true });
    expect(r[0]).toMatchObject({ actual: 38000.5, remaining: 1999.5, usedPercent: 95, over: false });
  });

  it('never calls a phase over budget when it has no budget', () => {
    expect(rows(true)[2]).toMatchObject({ budget: 0, actual: 250, remaining: null, usedPercent: 0, over: false });
  });

  it('shows no spending at all when the viewer does not see every expense', () => {
    const r = rows(false);
    expect(r.every((x) => x.actual === null && x.remaining === null && !x.over && x.usedPercent === 0)).toBe(true);
    expect(r[1].budget).toBe(65000);
  });

  it('falls back to the phase budget when there is no budget row', () => {
    expect(buildPhaseRows([ph2], [], true)[0]).toMatchObject({ budget: 40000, actual: 0, over: false });
  });

  it('filters by status, over budget and text', () => {
    const r = rows(true);
    expect(filterPhaseRows(r, { ...EMPTY_PHASE_QUERY, statuses: ['completed'] }, statusLabel).map((x) => x.phase.id)).toEqual([
      'ph2',
    ]);
    expect(filterPhaseRows(r, { ...EMPTY_PHASE_QUERY, overOnly: true }, statusLabel).map((x) => x.phase.id)).toEqual(['ph1']);
    expect(filterPhaseRows(r, { ...EMPTY_PHASE_QUERY, search: 'خرساني' }, statusLabel).map((x) => x.phase.id)).toEqual(['ph1']);
    expect(filterPhaseRows(r, { ...EMPTY_PHASE_QUERY, search: 'الدور الاول' }, statusLabel).map((x) => x.phase.id)).toEqual([
      'ph1',
    ]);
    expect(filterPhaseRows(r, { ...EMPTY_PHASE_QUERY, search: 'قيد' }, statusLabel).map((x) => x.phase.id)).toEqual(['ph1']);
  });

  it('counts the status choices with the other filters applied', () => {
    const r = rows(true);
    const facets = phaseFacets(r, EMPTY_PHASE_QUERY, statusLabel);
    expect(facets.statuses.map((s) => [s.key, s.count]).sort()).toEqual([
      ['completed', 1],
      ['in_progress', 1],
      ['planned', 1],
    ]);
    expect(facets.overCount).toBe(1);
    expect(phaseFacets(r, { ...EMPTY_PHASE_QUERY, overOnly: true }, statusLabel).statuses.map((s) => s.key)).toEqual([
      'in_progress',
    ]);
  });

  it('summarises budget against spending only where there is a budget to compare with', () => {
    const s = summarizePhaseRows(rows(true), true);
    expect(s).toMatchObject({ count: 3, budget: 105000, actual: 108250.5, overCount: 1, withoutBudget: 1 });
    // phase 3 has no budget: its 250 is spending, but not part of the comparison
    expect(s.remaining).toBe(-3000.5);
    expect(s.usedPercent).toBe(103);
  });

  it('gives the budget alone when spending is unknown', () => {
    expect(summarizePhaseRows(rows(false), false)).toMatchObject({
      budget: 105000,
      actual: null,
      remaining: null,
      usedPercent: 0,
      overCount: 0,
    });
  });

  it('summarises nothing without failing', () => {
    expect(summarizePhaseRows([], true)).toMatchObject({ count: 0, budget: 0, actual: 0, remaining: null, usedPercent: 0 });
  });
});

describe('boq', () => {
  const ph1 = phase('ph1', 1, { name: 'الأساسات', budgetAmount: 20000 });
  const ph2 = phase('ph2', 2, { name: 'الهيكل', budgetAmount: 30000 });
  const ph3 = phase('ph3', 3, { name: 'التشطيب', budgetAmount: undefined });
  const phases = [ph2, ph1, ph3];
  const item = (
    id: string,
    phaseId: string | undefined,
    description: string,
    total: number,
    over: Partial<BoqLineItem> = {}
  ): BoqLineItem => ({
    id,
    clientId: 'c1',
    phaseId,
    description,
    unit: 'm3',
    quantity: 1,
    unitPrice: total,
    total,
    createdAt: `2026-02-0${id.replace(/\D/g, '') || 1}T00:00:00.000Z`,
    updatedAt: '2026-02-01T00:00:00.000Z',
    ...over,
  });
  const items = [
    item('b1', 'ph2', 'خرسانة مسلحة للأعمدة', 24960, { itemCode: 'B-101' }),
    item('b2', 'ph2', 'حديد تسليح', 13650, { unit: 'ton' }),
    item('b3', 'ph1', 'حفر عام', 12000.5),
    item('b4', undefined, 'بند عام', 500),
    item('b5', 'ph3', 'دهان', 800),
    item('b6', 'gone', 'مرحلة محذوفة', 100),
  ];
  const groups = (q = {}) => buildBoqGroups(items, phases, { ...EMPTY_BOQ_QUERY, ...q }, unitLabel);

  it('groups by phase in phase order, with unassigned items (and ones of a deleted phase) last', () => {
    const g = groups();
    expect(g.map((x) => x.key)).toEqual(['ph1', 'ph2', 'ph3', 'loose']);
    expect(g[3]).toMatchObject({ title: BOQ_LOOSE_TITLE, total: 600 });
    expect(g[1].items.map((i) => i.id)).toEqual(['b1', 'b2']);
  });

  it('has no header for a client that has no phases at all', () => {
    const only = buildBoqGroups([items[3]], [], EMPTY_BOQ_QUERY, unitLabel);
    expect(only).toHaveLength(1);
    expect(only[0].title).toBeNull();
  });

  it('compares each phase with its budget, exactly', () => {
    const g = groups();
    expect(g[0]).toMatchObject({ budget: 20000, fullTotal: 12000.5, budgetState: 'within', overBy: 0 });
    expect(g[1]).toMatchObject({ budget: 30000, fullTotal: 38610, budgetState: 'over', overBy: 8610 });
    expect(g[2]).toMatchObject({ budget: null, budgetState: 'none' });
    expect(g[3].budgetState).toBe('none');
  });

  it('filters by text, phase and the budget state of the phase', () => {
    expect(groups({ search: 'حديد' }).flatMap((g) => g.items.map((i) => i.id))).toEqual(['b2']);
    expect(groups({ search: 'b-101' }).flatMap((g) => g.items.map((i) => i.id))).toEqual(['b1']);
    expect(groups({ search: 'طن' }).flatMap((g) => g.items.map((i) => i.id))).toEqual(['b2']);
    expect(groups({ phases: ['ph1', 'loose'] }).map((g) => g.key)).toEqual(['ph1', 'loose']);
    expect(groups({ budget: 'over' }).map((g) => g.key)).toEqual(['ph2']);
    expect(groups({ budget: 'within' }).map((g) => g.key)).toEqual(['ph1']);
  });

  it('keeps the whole phase total for the budget comparison while a search narrows the items', () => {
    const g = groups({ search: 'حديد' });
    expect(g[0]).toMatchObject({ total: 13650, fullTotal: 38610, budgetState: 'over' });
  });

  it('puts the largest items first inside each phase when asked', () => {
    expect(groups({ sort: 'largest' })[1].items.map((i) => i.id)).toEqual(['b1', 'b2']);
    expect(groups({ sort: 'largest' })[3].items.map((i) => i.id)).toEqual(['b4', 'b6']);
  });

  it('counts the phase choices with the other filters applied', () => {
    const all = boqFacets(items, phases, EMPTY_BOQ_QUERY, unitLabel);
    expect(all.phases.map((p) => [p.key, p.count])).toEqual([
      ['ph2', 2],
      ['loose', 2],
      ['ph1', 1],
      ['ph3', 1],
    ]);
    expect(all.phases.find((p) => p.key === 'loose')?.label).toBe(BOQ_LOOSE_TITLE);
    expect(all.budget).toEqual({ all: 6, over: 2, within: 1 });
    const over = boqFacets(items, phases, { ...EMPTY_BOQ_QUERY, budget: 'over' }, unitLabel);
    expect(over.phases.map((p) => p.key)).toEqual(['ph2']);
  });

  it('summarises the total and each phase share, adding up to 100', () => {
    const s = summarizeBoq(groups());
    expect(s.count).toBe(6);
    expect(s.total).toBe(52010.5);
    expect(s.phases.reduce((sum, p) => sum + p.percent, 0)).toBe(100);
    expect(s.phases[1]).toMatchObject({ key: 'ph2', total: 38610, percent: 74, budgetState: 'over', overBy: 8610 });
    expect(s.overCount).toBe(1);
  });

  it('summarises nothing without failing', () => {
    expect(summarizeBoq([])).toEqual({ count: 0, total: 0, phases: [], overCount: 0 });
  });
});

describe('site reports', () => {
  const report = (id: string, reportDate: string, over: Partial<SiteReport> = {}): SiteReport => ({
    id,
    clientId: 'c1',
    title: `تقرير ${id}`,
    reportDate,
    workCompleted: 'صب سقف الدور الأول',
    createdAt: `${reportDate}T08:00:00.000Z`,
    updatedAt: `${reportDate}T08:00:00.000Z`,
    ...over,
  });
  const list = [
    report('r1', '2026-08-10', { progressPercent: 20, workersOnSite: 8 }),
    report('r2', '2026-09-05', { progressPercent: 45, workersOnSite: 14, issues: 'تأخر توريد الحديد' }),
    report('r3', '2026-10-03', { progressPercent: 62, workersOnSite: 11, weather: 'مشمس' }),
    report('r4', '2026-10-17', { workCompleted: 'تنظيف الموقع', notes: 'بلا نسبة' }),
  ];
  const run = (q = {}) => filterReports(list, { ...EMPTY_REPORT_QUERY, ...q }).map((r) => r.id);

  it('lists the newest first, or the oldest first', () => {
    expect(run()).toEqual(['r4', 'r3', 'r2', 'r1']);
    expect(run({ sort: 'oldest' })).toEqual(['r1', 'r2', 'r3', 'r4']);
  });

  it('filters by month, progress band and problems', () => {
    expect(run({ month: '2026-10' })).toEqual(['r4', 'r3']);
    expect(run({ progress: 'under50' })).toEqual(['r2', 'r1']);
    expect(run({ progress: 'from50' })).toEqual(['r3']);
    expect(run({ progress: 'none' })).toEqual(['r4']);
    expect(run({ issuesOnly: true })).toEqual(['r2']);
  });

  it('searches the title, the work, the problems, the weather and the notes', () => {
    expect(run({ search: 'توريد' })).toEqual(['r2']);
    expect(run({ search: 'مشمس' })).toEqual(['r3']);
    expect(run({ search: 'تنظيف' })).toEqual(['r4']);
    expect(run({ search: 'تقرير r1' })).toEqual(['r1']);
  });

  it('puts a report into a band by its stated progress', () => {
    expect(reportProgressBand({ progressPercent: 49.9 })).toBe('under50');
    expect(reportProgressBand({ progressPercent: 50 })).toBe('from50');
    expect(reportProgressBand({ progressPercent: 0 })).toBe('under50');
    expect(reportProgressBand({})).toBe('none');
  });

  it('counts the choices with the other filters applied', () => {
    const facets = reportFacets(list, EMPTY_REPORT_QUERY);
    expect(facets.months.map((m) => [m.key, m.count])).toEqual([
      ['2026-10', 2],
      ['2026-09', 1],
      ['2026-08', 1],
    ]);
    expect(facets.progress).toEqual({ all: 4, under50: 2, from50: 1, none: 1 });
    expect(facets.issues).toBe(1);
    const october = reportFacets(list, { ...EMPTY_REPORT_QUERY, month: '2026-10' });
    expect(october.progress).toEqual({ all: 2, under50: 0, from50: 1, none: 1 });
    expect(october.months).toHaveLength(3);
  });

  it('reads the latest progress and what was gained since the first report that has one', () => {
    expect(summarizeReports(list)).toEqual({ count: 4, latestProgress: 62, progressChange: 42, issuesCount: 1, peakWorkers: 14 });
  });

  it('has no change to show with a single progress figure, and handles an empty list', () => {
    expect(summarizeReports([list[0]])).toMatchObject({ latestProgress: 20, progressChange: null });
    expect(summarizeReports([])).toEqual({
      count: 0,
      latestProgress: null,
      progressChange: null,
      issuesCount: 0,
      peakWorkers: null,
    });
  });
});
