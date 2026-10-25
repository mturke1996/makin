import dayjs from 'dayjs';
import type { Expense, GlobalFundTransaction } from '../../types';
import {
  buildAllUsersCustodyLedger,
  type CustodyExpenseRow,
  type UserCustodyView,
} from './custodyFifo';

/**
 * ملف عهدة المستخدم: كل ما تحتاجه شاشة العهد لعرض مستخدم واحد بدقة.
 *
 * لا يُعيد حساب أي توزيع: التخصيص (الخصم بالترتيب، عدم تقسيم المصروف، ترحيل العجز)
 * يأتي كاملاً من `buildAllUsersCustodyLedger` في custodyFifo.ts. هذا الملف يجمّع ويرتّب فقط،
 * وكل جمع يتم بعد التقريب إلى أجزاء الألف (milli) كي لا تتراكم كسور عشرية.
 */

/* ── Exact money helpers ────────────────────────────────────────────────── */

import { fromMilli, sumMoney, toMilli } from './money';
export { fromMilli, toMilli };
/** مجموع دقيق: يقرّب كل قيمة إلى جزء من الألف قبل الجمع. */
export const sumExact = (values: number[]): number => sumMoney(values);

/* ── Types ──────────────────────────────────────────────────────────────── */

export type CustodyTone = 'success' | 'warning' | 'danger';
export type CustodyStatusKey = 'active' | 'low' | 'finished' | 'overdrawn';
export type CustodyStatus = { key: CustodyStatusKey; label: string; tone: CustodyTone };

/** الشارة الصغيرة على سطر العهدة: أربع حالات تكفي ليفهمها غير المحاسب. */
export type CustodyBadgeKey = 'active' | 'finished' | 'deficit' | 'deducted';
export type CustodyBadge = { key: CustodyBadgeKey; label: string; tone: CustodyTone | 'neutral' };

export type UserStatusKey = 'none' | 'deficit' | 'finished' | 'low' | 'active';
export type UserCustodyStatus = { key: UserStatusKey; label: string; tone: CustodyTone | 'neutral' };

/** مفتاح المصروفات التي لا ترتبط بعميل. */
export const GENERAL_CLIENT_KEY = '__general';
/** مفتاح المصروفات المرتبطة بعميل لم يعد موجوداً أو لا يُعرف اسمه. */
export const UNKNOWN_CLIENT_KEY = '__unknown';

/** مصروف مخصوم من عهدة بعينها، كما يخرج من الدفتر. */
export type CustodyBatchExpense = {
  id: string;
  date: string;
  createdAt: string;
  description: string;
  category: string;
  notes?: string;
  clientKey: string;
  clientName: string;
  /** كامل قيمة المصروف (لا يُقسَّم أبداً). */
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  /** الجزء الذي تجاوز رصيد العهدة وصار عجزاً. */
  overdrawnAmount: number;
};

/** عهدة واحدة (دفعة إيداع) مع ما خُصم منها. */
export type CustodyBatch = {
  id: string;
  /** رقم العهدة مثل EHD-001. */
  ref: string;
  date: string;
  createdAt: string;
  description: string;
  notes?: string;
  /** مبلغ العهدة المودَع. */
  amount: number;
  /** عجز عهدة سابقة خُصم من هذه العهدة. */
  carryOver: number;
  carryFromId?: string;
  carryFromRef?: string;
  /** عجز هذه العهدة الذي رُحّل إلى العهدة التالية. */
  carriedOut: number;
  carryToId?: string;
  carryToRef?: string;
  /** مجموع المصروفات المخصومة منها. */
  spent: number;
  /** المتبقي (بالسالب = عجز قائم). */
  remaining: number;
  /** الرصيد الافتتاحي بعد خصم العجز السابق. */
  opening: number;
  /** نسبة المستهلك من العهدة (0 إلى 100) بما فيه العجز المخصوم. */
  usedPct: number;
  status: CustodyStatus;
  /** الحالة المبسّطة للقائمة المضغوطة. */
  badge: CustodyBadge;
  expenses: CustodyBatchExpense[];
  /** سجل الإيداع الأصلي (للتعديل والحذف). */
  source: GlobalFundTransaction;
};

export type TimelineKind = 'deposit' | 'expense' | 'withdrawal';

export type TimelineEntry = {
  id: string;
  kind: TimelineKind;
  date: string;
  createdAt: string;
  title: string;
  /** بإشارته: + إيداع، − مصروف أو سحب. */
  amount: number;
  /** الرصيد الكلي للمستخدم بعد هذه الحركة. السحب لا يغيّره لأنه خارج دفتر العهد. */
  balanceAfter: number;
  /** رقم العهدة المرتبطة (الإيداع نفسه أو العهدة التي خُصم منها المصروف). */
  custodyRef?: string;
  /** معرّف العهدة المرتبطة (للتصفية والتعديل). */
  custodyId?: string;
  clientKey?: string;
  clientName?: string;
  category?: string;
  notes?: string;
  /** مقدار تجاوز المصروف لرصيد العهدة. */
  overdrawnAmount?: number;
  /** false للسحب: مسجَّل لكنه لا يدخل في رصيد العهدة. */
  countedInBalance: boolean;
};

export type UserCustodyTotals = {
  deposited: number;
  spent: number;
  /** المتبقي الصافي (إيداعات − مصروفات)، سالب عند العجز. */
  remaining: number;
  /** الرصيد المتاح للصرف (≥ 0). */
  available: number;
  /** العجز القائم (≥ 0). */
  deficit: number;
  /** عجز رُحّل بين العهد (ينتقل من عهدة إلى التالية وليس مصروفاً إضافياً). */
  carriedBetween: number;
  /** سحوبات مسجَّلة خارج دفتر العهد. */
  withdrawn: number;
  /** نسبة المصروف من المودَع (0 إلى 100). */
  usedPct: number;
};

export type UserCustodyCounts = {
  custodies: number;
  active: number;
  finished: number;
  expenses: number;
};

export type UserCustodyProfile = {
  /** معرّف المستخدم (UID، أو الاسم إن لم يُسجَّل UID على الإيداع). */
  userId: string;
  userName: string;
  hasCustody: boolean;
  totals: UserCustodyTotals;
  counts: UserCustodyCounts;
  status: UserCustodyStatus;
  /** من الأقدم إلى الأحدث. */
  custodies: CustodyBatch[];
  /** من الأحدث إلى الأقدم. */
  timeline: TimelineEntry[];
};

export type CustodyOverviewTotals = {
  deposited: number;
  spent: number;
  remaining: number;
  deficit: number;
  holders: number;
  deficitUsers: number;
};

export type ProfileOptions = {
  /** اسم المستخدم عند غياب UID على الإيداعات. */
  userName?: string;
  /** UID إلى الاسم المعروض. */
  userMap?: Record<string, string>;
  /** معرّف العميل إلى اسمه. */
  clientMap?: Record<string, string>;
};

/* ── Status ─────────────────────────────────────────────────────────────── */

/** حالة عهدة واحدة. المنخفضة: متبقيها أقل من 30% من صافي مبلغها. */
export function getCustodyStatus(remaining: number, amount: number, carryOver = 0): CustodyStatus {
  const r = toMilli(remaining);
  const net = Math.max(0, toMilli(amount) - toMilli(carryOver));
  if (r < 0) return { key: 'overdrawn', label: 'متجاوزة', tone: 'danger' };
  if (r === 0) return { key: 'finished', label: 'منتهية', tone: 'warning' };
  if (net > 0 && r < net * 0.3) return { key: 'low', label: 'منخفضة', tone: 'warning' };
  return { key: 'active', label: 'نشطة', tone: 'success' };
}

/**
 * شارة العهدة في القائمة المضغوطة:
 * عليها عجز (رصيدها بالسالب) ثم منتهية (نفد رصيدها، ومنها ما رُحّل عجزه للتالية)
 * ثم خُصم منها عجز (بدأت برصيد أقل لأن عجزاً سابقاً خُصم منها) ثم نشطة.
 */
export function getCustodyBadge(remaining: number, carryOver = 0): CustodyBadge {
  const r = toMilli(remaining);
  if (r < 0) return { key: 'deficit', label: 'عليها عجز', tone: 'danger' };
  if (r === 0) return { key: 'finished', label: 'منتهية', tone: 'neutral' };
  if (toMilli(carryOver) > 0) return { key: 'deducted', label: 'خُصم منها عجز', tone: 'warning' };
  return { key: 'active', label: 'نشطة', tone: 'success' };
}

function getUserStatus(batches: CustodyBatch[], remaining: number): UserCustodyStatus {
  if (batches.length === 0) return { key: 'none', label: 'بدون عهدة', tone: 'neutral' };
  const r = toMilli(remaining);
  if (r < 0) return { key: 'deficit', label: 'عجز قائم', tone: 'danger' };
  if (r === 0) return { key: 'finished', label: 'عهدة منتهية', tone: 'warning' };
  // منخفضة: المتاح أقل من 30% من صافي العهد التي ما زال فيها رصيد.
  const pendingNet = batches
    .filter((b) => toMilli(b.remaining) > 0)
    .reduce((s, b) => s + Math.max(0, toMilli(b.amount) - toMilli(b.carryOver)), 0);
  if (pendingNet > 0 && r < pendingNet * 0.3) return { key: 'low', label: 'رصيد منخفض', tone: 'warning' };
  return { key: 'active', label: 'نشطة', tone: 'success' };
}

/* ── Building blocks ────────────────────────────────────────────────────── */

/** وقت الحركة بنفس قاعدة الدفتر (createdAt ثم date) حتى يتطابق الترتيب. */
function eventTime(createdAt?: string, date?: string): number {
  for (const v of [createdAt, date]) {
    if (!v) continue;
    const t = dayjs(v);
    if (t.isValid()) return t.valueOf();
  }
  return 0;
}

function clientIdentity(exp: CustodyExpenseRow, clientMap?: Record<string, string>): { key: string; name: string } {
  if (!exp.clientId) return { key: GENERAL_CLIENT_KEY, name: 'مصروف عام' };
  const name = clientMap?.[exp.clientId];
  if (name) return { key: exp.clientId, name };
  return { key: UNKNOWN_CLIENT_KEY, name: 'عميل غير معروف' };
}

function toBatch(c: UserCustodyView['custodies'][number], clientMap?: Record<string, string>): CustodyBatch {
  const opening = fromMilli(toMilli(c.amount) - toMilli(c.carryOver));
  const consumed = toMilli(c.amount) - Math.max(0, toMilli(c.remaining));
  const usedPct = toMilli(c.amount) > 0 ? Math.min(100, Math.max(0, (consumed / toMilli(c.amount)) * 100)) : 0;
  return {
    id: c.id,
    ref: c.ref,
    date: c.date,
    createdAt: c.createdAt,
    description: c.description,
    notes: c.notes,
    amount: c.amount,
    carryOver: c.carryOver,
    carryFromId: c.carryFromId,
    carryFromRef: c.carryFromRef,
    carriedOut: c.carriedOut,
    carryToId: c.carryToId,
    carryToRef: c.carryToRef,
    spent: c.spent,
    remaining: c.remaining,
    opening,
    usedPct,
    status: getCustodyStatus(c.remaining, c.amount, c.carryOver),
    badge: getCustodyBadge(c.remaining, c.carryOver),
    expenses: c.expenses.map((e) => {
      const who = clientIdentity(e, clientMap);
      return {
        id: e.id,
        date: e.date,
        createdAt: e.createdAt,
        description: e.description,
        category: e.category,
        notes: e.notes,
        clientKey: who.key,
        clientName: who.name,
        amount: e.usedAmount,
        balanceBefore: e.balanceBefore,
        balanceAfter: e.balanceAfter,
        overdrawnAmount: e.overdrawnAmount,
      };
    }),
    source: c._raw,
  };
}

function matchesTx(tx: GlobalFundTransaction, userId: string, userName: string): boolean {
  if (userId && tx.userId === userId) return true;
  return !!userName && tx.userName === userName;
}

function buildTimeline(
  batches: CustodyBatch[],
  withdrawals: GlobalFundTransaction[],
): { entries: TimelineEntry[]; withdrawn: number } {
  type Raw = { t: number; kind: 0 | 1 | 2; order: number; entry: Omit<TimelineEntry, 'balanceAfter'> };
  const raw: Raw[] = [];
  let order = 0;

  batches.forEach((b) => {
    raw.push({
      t: eventTime(b.createdAt, b.date),
      kind: 0,
      order: order++,
      entry: {
        id: `dep-${b.id}`,
        kind: 'deposit',
        date: b.date,
        createdAt: b.createdAt,
        title: b.description,
        amount: b.amount,
        custodyRef: b.ref,
        custodyId: b.id,
        notes: b.notes,
        countedInBalance: true,
      },
    });
    b.expenses.forEach((e) =>
      raw.push({
        t: eventTime(e.createdAt, e.date),
        kind: 1,
        order: order++,
        entry: {
          id: `exp-${e.id}`,
          kind: 'expense',
          date: e.date,
          createdAt: e.createdAt,
          title: e.description,
          amount: -e.amount,
          custodyRef: b.ref,
          custodyId: b.id,
          clientKey: e.clientKey,
          clientName: e.clientName,
          category: e.category,
          notes: e.notes,
          overdrawnAmount: e.overdrawnAmount,
          countedInBalance: true,
        },
      }),
    );
  });

  withdrawals.forEach((w) =>
    raw.push({
      t: eventTime(w.createdAt, w.date),
      kind: 2,
      order: order++,
      entry: {
        id: `wd-${w.id}`,
        kind: 'withdrawal',
        date: w.date,
        createdAt: w.createdAt,
        title: w.description,
        amount: -toMilli(w.amount) / 1000,
        notes: w.notes,
        countedInBalance: false,
      },
    }),
  );

  raw.sort((a, b) => a.t - b.t || a.kind - b.kind || a.order - b.order);

  let balance = 0;
  let withdrawn = 0;
  const ascending = raw.map(({ entry }) => {
    if (entry.countedInBalance) balance += toMilli(entry.amount);
    else withdrawn += Math.abs(toMilli(entry.amount));
    return { ...entry, balanceAfter: fromMilli(balance) };
  });

  return { entries: ascending.reverse(), withdrawn: fromMilli(withdrawn) };
}

/* ── Profile ────────────────────────────────────────────────────────────── */

export function emptyCustodyProfile(userId: string, userName = ''): UserCustodyProfile {
  return {
    userId,
    userName,
    hasCustody: false,
    totals: { deposited: 0, spent: 0, remaining: 0, available: 0, deficit: 0, carriedBetween: 0, withdrawn: 0, usedPct: 0 },
    counts: { custodies: 0, active: 0, finished: 0, expenses: 0 },
    status: { key: 'none', label: 'بدون عهدة', tone: 'neutral' },
    custodies: [],
    timeline: [],
  };
}

function profileFromView(
  view: UserCustodyView,
  transactions: GlobalFundTransaction[],
  clientMap?: Record<string, string>,
  nameOverride?: string,
): UserCustodyProfile {
  const userId = view.uid || view.key;
  const userName = nameOverride || view.name;
  const batches = view.custodies.map((c) => toBatch(c, clientMap));

  const withdrawals = transactions.filter(
    (t) => t.type === 'withdrawal' && matchesTx(t, view.uid, view.userName || view.name),
  );
  const { entries, withdrawn } = buildTimeline(batches, withdrawals);

  const depositedMilli = batches.reduce((s, b) => s + toMilli(b.amount), 0);
  const spentMilli = batches.reduce((s, b) => s + toMilli(b.spent), 0);
  // المتبقي = مجموع المتبقي في العهد = المودَع − المصروف (العجز المرحّل ينتقل بين العهد ولا يُضاف).
  const remainingMilli = batches.reduce((s, b) => s + toMilli(b.remaining), 0);
  const remaining = fromMilli(remainingMilli);
  const carriedBetween = sumExact(batches.map((b) => b.carriedOut));
  const active = batches.filter((b) => b.status.key === 'active' || b.status.key === 'low').length;

  return {
    userId,
    userName,
    hasCustody: batches.length > 0,
    totals: {
      deposited: fromMilli(depositedMilli),
      spent: fromMilli(spentMilli),
      remaining,
      available: Math.max(0, remaining),
      deficit: Math.max(0, -remaining),
      carriedBetween,
      withdrawn,
      usedPct: depositedMilli > 0 ? Math.min(100, Math.max(0, (spentMilli / depositedMilli) * 100)) : 0,
    },
    counts: {
      custodies: batches.length,
      active,
      finished: batches.length - active,
      expenses: batches.reduce((s, b) => s + b.expenses.length, 0),
    },
    status: getUserStatus(batches, remaining),
    custodies: batches,
    timeline: entries,
  };
}

/** ملفات عهد كل أصحاب العهد، مرتبة للقائمة (العجز أولاً ثم الأكبر رصيداً). */
export function buildAllCustodyProfiles(
  transactions: GlobalFundTransaction[],
  expenses: Expense[],
  options: ProfileOptions = {},
): UserCustodyProfile[] {
  const views = buildAllUsersCustodyLedger(transactions, expenses, options.userMap ?? {}, options.clientMap);
  return views
    .map((v) => profileFromView(v, transactions, options.clientMap))
    .sort(compareProfilesForList);
}

/** ملف عهدة مستخدم واحد. عند عدم وجود عهدة يعيد ملفاً فارغاً بدل null. */
export function buildUserCustodyProfile(
  userId: string,
  transactions: GlobalFundTransaction[],
  expenses: Expense[],
  options: ProfileOptions = {},
): UserCustodyProfile {
  const views = buildAllUsersCustodyLedger(transactions, expenses, options.userMap ?? {}, options.clientMap);
  const name = options.userName?.trim();
  const view =
    views.find((v) => !!userId && (v.uid === userId || v.key === userId)) ??
    (name ? views.find((v) => (v.userName === name || v.name === name) && (!v.uid || !userId)) : undefined);
  const fallbackName = name || options.userMap?.[userId] || '';
  return view ? profileFromView(view, transactions, options.clientMap, name) : emptyCustodyProfile(userId, fallbackName);
}

/** يجد ملفاً في قائمة جاهزة بالمعرّف أو بالاسم. */
export function findCustodyProfile(
  profiles: UserCustodyProfile[],
  userId: string,
  userName?: string,
): UserCustodyProfile | undefined {
  return (
    profiles.find((p) => p.userId === userId) ??
    (userName ? profiles.find((p) => p.userName === userName && (!p.userId || !userId)) : undefined)
  );
}

/** الترتيب: العجز الأكبر أولاً، ثم الأكبر رصيداً متاحاً، ثم الاسم. */
export function compareProfilesForList(a: UserCustodyProfile, b: UserCustodyProfile): number {
  const da = toMilli(a.totals.deficit);
  const db = toMilli(b.totals.deficit);
  if ((da > 0) !== (db > 0)) return da > 0 ? -1 : 1;
  if (da !== db) return db - da;
  const ra = toMilli(a.totals.available);
  const rb = toMilli(b.totals.available);
  if (ra !== rb) return rb - ra;
  return a.userName.localeCompare(b.userName, 'ar');
}

/** إجماليات شاشة العهد (كل المستخدمين). */
export function summarizeCustodyProfiles(profiles: UserCustodyProfile[]): CustodyOverviewTotals {
  const withCustody = profiles.filter((p) => p.hasCustody);
  return {
    deposited: sumExact(withCustody.map((p) => p.totals.deposited)),
    spent: sumExact(withCustody.map((p) => p.totals.spent)),
    remaining: sumExact(withCustody.map((p) => p.totals.remaining)),
    deficit: sumExact(withCustody.map((p) => p.totals.deficit)),
    holders: withCustody.length,
    deficitUsers: withCustody.filter((p) => toMilli(p.totals.deficit) > 0).length,
  };
}

/* ── One custody's own log ──────────────────────────────────────────────── */

export type CustodyLogKind = 'deposit' | 'carry-in' | 'expense' | 'carry-out';

/** سطر في سجل عهدة واحدة، والرصيد فيه رصيد هذه العهدة وحدها. */
export type CustodyLogRow = {
  id: string;
  kind: CustodyLogKind;
  title: string;
  date: string;
  createdAt: string;
  /** بإشارته: + إيداع أو ترحيل عجز إلى خارجها، − مصروف أو عجز مخصوم من عهدة سابقة. */
  amount: number;
  /** رصيد هذه العهدة بعد السطر (بالسالب = عجز). */
  balanceAfter: number;
  clientName?: string;
  category?: string;
  notes?: string;
  overdrawnAmount?: number;
  /** رقم العهدة الأخرى في سطري الخصم والترحيل. */
  otherRef?: string;
};

/**
 * سجل عهدة واحدة، من الأحدث إلى الأقدم: الإيداع، ثم عجز عهدة سابقة خُصم منها إن وُجد، ثم مصروفاتها،
 * ثم ترحيل عجزها إلى العهدة التالية إن تجاوزت رصيدها.
 * الرصيد بعد كل سطر يخصّ هذه العهدة، وآخر سطر زمنياً يساوي `remaining` فيها تماماً.
 */
export function buildCustodyLog(batch: CustodyBatch): CustodyLogRow[] {
  const rows: CustodyLogRow[] = [
    {
      id: `dep-${batch.id}`,
      kind: 'deposit',
      title: batch.description || 'إيداع العهدة',
      date: batch.date,
      createdAt: batch.createdAt,
      amount: batch.amount,
      balanceAfter: batch.amount,
      notes: batch.notes,
    },
  ];

  if (toMilli(batch.carryOver) > 0) {
    rows.push({
      id: `carry-in-${batch.id}`,
      kind: 'carry-in',
      title: 'خصم عجز عهدة سابقة',
      date: batch.date,
      createdAt: batch.createdAt,
      amount: -batch.carryOver,
      balanceAfter: batch.opening,
      otherRef: batch.carryFromRef,
    });
  }

  batch.expenses.forEach((e) =>
    rows.push({
      id: `exp-${e.id}`,
      kind: 'expense',
      title: e.description,
      date: e.date,
      createdAt: e.createdAt,
      amount: -e.amount,
      balanceAfter: e.balanceAfter,
      clientName: e.clientName,
      category: e.category,
      notes: e.notes,
      overdrawnAmount: e.overdrawnAmount,
    }),
  );

  if (toMilli(batch.carriedOut) > 0) {
    const last = batch.expenses[batch.expenses.length - 1];
    rows.push({
      id: `carry-out-${batch.id}`,
      kind: 'carry-out',
      title: 'ترحيل العجز إلى العهدة التالية',
      date: last?.date ?? batch.date,
      createdAt: last?.createdAt ?? batch.createdAt,
      amount: batch.carriedOut,
      balanceAfter: batch.remaining,
      otherRef: batch.carryToRef,
    });
  }

  return rows.reverse();
}
