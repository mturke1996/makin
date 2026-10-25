import dayjs from 'dayjs';
import type { Client, Invoice, Payment, PaymentMilestone } from '../../types';
import { findOverdueInvoices } from './overdueInvoices';
import { getInvoicePaymentSummary } from './invoicePayments';
import { daysWord } from './clientInsights';
import { fromMilli, sumMoney, toMilli } from './money';

/**
 * The agreed payment schedule of one client and the receivables built from it.
 *
 * A milestone stores what is owed and when, never whether it was paid. What the client has handed over
 * is allocated to the milestones in their agreed order (the first instalment is settled before the
 * second), so there is no flag to keep in step with the payments and a deleted payment simply
 * re-opens the instalment it had covered.
 */

/** A milestone due within this many days is flagged "due soon". */
export const DUE_SOON_DAYS = 7;
/** The forecast window of "expected within 30 days". */
export const FORECAST_DAYS = 30;

export type MilestoneStatus = 'paid' | 'overdue' | 'due_soon' | 'upcoming';

export interface MilestoneRow {
  milestone: PaymentMilestone;
  /** How much of it the payments received so far cover. */
  covered: number;
  remaining: number;
  status: MilestoneStatus;
  /** Something was received towards it, but not all. */
  partial: boolean;
  /** Days past the due date; 0 when it is not late. */
  daysLate: number;
  /** Days until the due date; 0 when due today or already late. */
  daysUntil: number;
}

export interface PaymentSchedule {
  rows: MilestoneRow[];
  total: number;
  covered: number;
  remaining: number;
  overdueAmount: number;
  overdueCount: number;
  /** The earliest instalment that is not fully covered. */
  next?: MilestoneRow;
  /** Received beyond the whole schedule (the schedule is shorter than the contract, or overpaid). */
  surplus: number;
}

const byAgreedOrder = (a: PaymentMilestone, b: PaymentMilestone) =>
  a.order - b.order || a.dueDate.localeCompare(b.dueDate) || a.createdAt.localeCompare(b.createdAt);

/** «مسددة»، «متأخرة 12 يوماً»، «تستحق بعد 3 أيام»، «قادمة»: one wording for the screen and the printed report. */
export function milestoneStatusLabel(row: Pick<MilestoneRow, 'status' | 'daysLate' | 'daysUntil'>): string {
  switch (row.status) {
    case 'paid':
      return 'مسددة';
    case 'overdue':
      return `متأخرة ${daysWord(row.daysLate)}`;
    case 'due_soon':
      return row.daysUntil === 0 ? 'تستحق اليوم' : `تستحق بعد ${daysWord(row.daysUntil)}`;
    default:
      return 'قادمة';
  }
}

/** Everything the client has handed over, whatever invoice it was booked against. */
export function clientCollected(payments: readonly Payment[], clientId: string): number {
  return sumMoney(payments.filter((p) => p.clientId === clientId).map((p) => p.amount));
}

export function buildPaymentSchedule(
  milestones: readonly PaymentMilestone[],
  collected: number,
  now?: Date,
): PaymentSchedule {
  const today = dayjs(now).startOf('day');
  let pool = Math.max(0, toMilli(collected));
  let totalMilli = 0;
  let coveredMilli = 0;
  let overdueMilli = 0;
  let overdueCount = 0;

  const rows = [...milestones].sort(byAgreedOrder).map((milestone): MilestoneRow => {
    const amount = toMilli(milestone.amount);
    const covered = Math.min(pool, amount);
    pool -= covered;
    const remaining = amount - covered;

    const due = dayjs(milestone.dueDate).startOf('day');
    const diff = today.diff(due, 'day'); // > 0 when late
    let status: MilestoneStatus;
    if (remaining === 0) status = 'paid';
    else if (diff > 0) status = 'overdue';
    else if (-diff <= DUE_SOON_DAYS) status = 'due_soon';
    else status = 'upcoming';

    totalMilli += amount;
    coveredMilli += covered;
    if (status === 'overdue') {
      overdueMilli += remaining;
      overdueCount += 1;
    }
    return {
      milestone,
      covered: fromMilli(covered),
      remaining: fromMilli(remaining),
      status,
      partial: covered > 0 && remaining > 0,
      daysLate: status === 'overdue' ? diff : 0,
      daysUntil: diff < 0 ? -diff : 0,
    };
  });

  return {
    rows,
    total: fromMilli(totalMilli),
    covered: fromMilli(coveredMilli),
    remaining: fromMilli(totalMilli - coveredMilli),
    overdueAmount: fromMilli(overdueMilli),
    overdueCount,
    next: rows.find((r) => r.status !== 'paid'),
    surplus: fromMilli(pool),
  };
}

/** The few facts the client's attention list needs from a schedule; nothing when the client has none. */
export function scheduleHighlights(schedule: PaymentSchedule) {
  if (schedule.rows.length === 0) return undefined;
  const late = schedule.rows.filter((r) => r.status === 'overdue');
  const oldest = late.reduce<MilestoneRow | undefined>((a, b) => (!a || b.daysLate > a.daysLate ? b : a), undefined);
  const soon = schedule.rows.filter((r) => r.status === 'due_soon').sort((a, b) => a.daysUntil - b.daysUntil)[0];
  return {
    overdueAmount: schedule.overdueAmount,
    overdueCount: schedule.overdueCount,
    oldest: oldest && { title: oldest.milestone.title, daysLate: oldest.daysLate },
    dueSoon: soon && { title: soon.milestone.title, remaining: soon.remaining, daysUntil: soon.daysUntil },
  };
}

/* ── splitting the contract into instalments ─────────────────────────────── */

export interface MilestoneDraft {
  title: string;
  amount: number;
  dueDate: string;
}

const ORDINALS = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة'];

export const milestoneTitle = (index: number) => `الدفعة ${ORDINALS[index] ?? index + 1}`;

/** Common splits offered as one tap; each number is a share of the whole. */
export const SCHEDULE_PRESETS: { id: string; label: string; weights: number[] }[] = [
  { id: '50-50', label: '50% ثم 50%', weights: [50, 50] },
  { id: '40-30-30', label: '40% ثم 30% ثم 30%', weights: [40, 30, 30] },
  { id: '30-40-30', label: '30% ثم 40% ثم 30%', weights: [30, 40, 30] },
  { id: '25x4', label: '4 دفعات متساوية', weights: [25, 25, 25, 25] },
];

/**
 * Splits `total` over instalments weighted by `weights`, due `intervalDays` apart from `startDate`.
 * Thousandths are shared out exactly: the instalments always add up to the total, the last one taking
 * the odd remainder.
 */
export function splitContract(
  total: number,
  weights: readonly number[],
  opts: { startDate: string; intervalDays: number },
): MilestoneDraft[] {
  const valid = weights.filter((w) => Number.isFinite(w) && w > 0);
  const totalMilli = toMilli(total);
  if (valid.length === 0 || totalMilli <= 0) return [];

  const weightSum = valid.reduce((a, b) => a + b, 0);
  let allocated = 0;
  return valid.map((weight, i) => {
    const last = i === valid.length - 1;
    const milli = last ? totalMilli - allocated : Math.floor((totalMilli * weight) / weightSum);
    allocated += milli;
    return {
      title: milestoneTitle(i),
      amount: fromMilli(milli),
      dueDate: dayjs(opts.startDate).add(i * opts.intervalDays, 'day').format('YYYY-MM-DD'),
    };
  });
}

/** `n` equal instalments. */
export const splitEvenly = (total: number, count: number, opts: { startDate: string; intervalDays: number }) =>
  splitContract(total, Array.from({ length: Math.max(0, Math.floor(count)) }, () => 1), opts);

/* ── receivables and their age ───────────────────────────────────────────── */

export interface AgingBucketDef {
  id: 'd30' | 'd60' | 'd90' | 'd90p';
  label: string;
  /** Days late, inclusive. */
  min: number;
  max: number;
}

export const AGING_BUCKETS: readonly AgingBucketDef[] = [
  { id: 'd30', label: '1 – 30 يوماً', min: 1, max: 30 },
  { id: 'd60', label: '31 – 60 يوماً', min: 31, max: 60 },
  { id: 'd90', label: '61 – 90 يوماً', min: 61, max: 90 },
  { id: 'd90p', label: 'أكثر من 90 يوماً', min: 91, max: Infinity },
];

export const agingBucketOf = (daysLate: number): AgingBucketDef | undefined =>
  AGING_BUCKETS.find((b) => daysLate >= b.min && daysLate <= b.max);

/**
 * Where a client's receivable comes from. The agreed schedule is the basis when the client has one;
 * otherwise their invoices. Never both: the same money would be counted twice, because a payment
 * settles an instalment and the invoice it was booked against alike.
 */
export type ReceivableBasis = 'schedule' | 'invoices' | 'none';

export interface ReceivableItem {
  key: string;
  kind: 'milestone' | 'invoice';
  title: string;
  dueDate: string;
  /** Still owed. */
  amount: number;
  /** Positive when late, 0 or negative (days until due) when not yet due. */
  daysLate: number;
}

export interface ClientReceivable {
  client: Client;
  basis: ReceivableBasis;
  /** Past due, the oldest first. */
  overdue: ReceivableItem[];
  overdueTotal: number;
  oldestDays: number;
  /** Due within the forecast window, the soonest first. */
  upcoming: ReceivableItem[];
  upcomingTotal: number;
}

export interface AgingBucket {
  def: AgingBucketDef;
  amount: number;
  count: number;
}

export interface ReceivablesReport {
  /** Clients with something overdue, the oldest first. */
  late: ClientReceivable[];
  /** Clients with something due in the next 30 days, the soonest first. */
  soon: ClientReceivable[];
  buckets: AgingBucket[];
  overdueTotal: number;
  overdueCount: number;
  upcomingTotal: number;
}

export interface ReceivablesInput {
  clients: readonly Client[];
  payments: readonly Payment[];
  milestones: readonly PaymentMilestone[];
  /** Pass none when the person may not see invoices: clients without a schedule then have no basis. */
  invoices?: readonly Invoice[];
  now?: Date;
}

function scheduleItems(rows: readonly MilestoneRow[], today: dayjs.Dayjs): ReceivableItem[] {
  return rows
    .filter((r) => r.status !== 'paid')
    .map((r) => ({
      key: `m:${r.milestone.id}`,
      kind: 'milestone' as const,
      title: r.milestone.title,
      dueDate: r.milestone.dueDate,
      amount: r.remaining,
      daysLate: today.diff(dayjs(r.milestone.dueDate).startOf('day'), 'day'),
    }));
}

function invoiceItems(invoices: readonly Invoice[], payments: readonly Payment[], now: Date | undefined, today: dayjs.Dayjs): ReceivableItem[] {
  // A draft was never sent to the client, so it is not owed yet.
  const sent = invoices.filter((inv) => inv.status !== 'draft' && inv.status !== 'cancelled' && inv.status !== 'paid');
  const items: ReceivableItem[] = [];
  const overdueIds = new Set<string>();
  for (const { inv, remaining, days } of findOverdueInvoices(sent, payments, true, now)) {
    overdueIds.add(inv.id);
    items.push({ key: `i:${inv.id}`, kind: 'invoice', title: `فاتورة ${inv.invoiceNumber}`, dueDate: inv.dueDate, amount: remaining ?? 0, daysLate: days });
  }
  for (const inv of sent) {
    if (overdueIds.has(inv.id)) continue;
    const { remaining } = getInvoicePaymentSummary(inv, payments as Payment[]);
    if (remaining <= 0) continue;
    items.push({
      key: `i:${inv.id}`,
      kind: 'invoice',
      title: `فاتورة ${inv.invoiceNumber}`,
      dueDate: inv.dueDate,
      amount: remaining,
      daysLate: today.diff(dayjs(inv.dueDate).startOf('day'), 'day'),
    });
  }
  return items;
}

/** Who owes what, how late, and what is expected in the next 30 days. */
export function buildReceivables(input: ReceivablesInput): ReceivablesReport {
  const { clients, payments, milestones, invoices, now } = input;
  const today = dayjs(now).startOf('day');

  const milestonesOf = new Map<string, PaymentMilestone[]>();
  for (const m of milestones) milestonesOf.set(m.clientId, [...(milestonesOf.get(m.clientId) ?? []), m]);
  const invoicesOf = new Map<string, Invoice[]>();
  for (const inv of invoices ?? []) invoicesOf.set(inv.clientId, [...(invoicesOf.get(inv.clientId) ?? []), inv]);

  const all: ClientReceivable[] = [];
  for (const client of clients) {
    const own = milestonesOf.get(client.id) ?? [];
    const ownInvoices = invoicesOf.get(client.id) ?? [];
    let basis: ReceivableBasis = 'none';
    let items: ReceivableItem[] = [];
    if (own.length > 0) {
      basis = 'schedule';
      items = scheduleItems(buildPaymentSchedule(own, clientCollected(payments, client.id), now).rows, today);
    } else if (ownInvoices.length > 0) {
      basis = 'invoices';
      items = invoiceItems(ownInvoices, payments.filter((p) => p.clientId === client.id), now, today);
    }
    if (basis === 'none') continue;

    const overdue = items.filter((i) => i.daysLate > 0).sort((a, b) => b.daysLate - a.daysLate);
    const upcoming = items
      .filter((i) => i.daysLate <= 0 && -i.daysLate <= FORECAST_DAYS)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    if (overdue.length === 0 && upcoming.length === 0) continue;

    all.push({
      client,
      basis,
      overdue,
      overdueTotal: sumMoney(overdue.map((i) => i.amount)),
      oldestDays: overdue[0]?.daysLate ?? 0,
      upcoming,
      upcomingTotal: sumMoney(upcoming.map((i) => i.amount)),
    });
  }

  const late = all.filter((c) => c.overdue.length > 0).sort((a, b) => b.oldestDays - a.oldestDays || b.overdueTotal - a.overdueTotal);
  const soon = all
    .filter((c) => c.upcoming.length > 0)
    .sort((a, b) => a.upcoming[0].dueDate.localeCompare(b.upcoming[0].dueDate));

  const buckets: AgingBucket[] = AGING_BUCKETS.map((def) => {
    const inBucket = late.flatMap((c) => c.overdue).filter((i) => i.daysLate >= def.min && i.daysLate <= def.max);
    return { def, amount: sumMoney(inBucket.map((i) => i.amount)), count: inBucket.length };
  });

  return {
    late,
    soon,
    buckets,
    overdueTotal: sumMoney(late.map((c) => c.overdueTotal)),
    overdueCount: late.reduce((n, c) => n + c.overdue.length, 0),
    upcomingTotal: sumMoney(soon.map((c) => c.upcomingTotal)),
  };
}
