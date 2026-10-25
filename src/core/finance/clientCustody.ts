import dayjs from 'dayjs';
import type { Expense, ExpenseCategory, GlobalFundTransaction, UserBalance } from '../../types';
import { buildUserCustodyLedger, type CustodyLedgerRow } from './custodyFifo';
import {
  getCustodyBadge,
  getCustodyStatus,
  type CustodyBadge,
  type CustodyStatus,
  type CustodyTone,
} from './custodyProfile';
import { subtractMoney, sumMoney, toMilli } from './money';

/**
 * عهد عميل واحد: كل عهدة (إيداع واحد) بتفاصيلها الكاملة.
 *
 * العهدة على العميل هي `UserBalance`. التخصيص نفسه تماماً كما في صفحة الصندوق (`buildUserCustodyLedger`):
 * أقدم عهدة لم تُغلق تُخصم أولاً، والمصروف لا يُقسَّم أبداً، وما تجاوز الرصيد يصير عجزاً يُخصم مرة واحدة
 * من العهدة التالية، والمصروف الذي سبق أول عهدة لا يُحتسب. الفرق الوحيد أن المصروفات هنا مصروفات
 * هذا العميل فقط، فلا تُخصم من عهدته مصروفات المستخدم على عملاء آخرين.
 *
 * الدقة تتبع ما يراه المشاهد: رصيد مستخدم لا يُعرف إلا إذا رأى المشاهد كل مصروفاته. غير ذلك لا يُعرض إلا
 * المبلغ الممنوح وتاريخه (`exact: false`) كي لا يظهر رصيد مختلق.
 */

/** من يُسمح بتسميته في دليل المستخدمين (أي شكل يحوي هذه الحقول يصلح). */
export interface DirectoryUser {
  id: string;
  uid?: string;
  displayName?: string;
}

export interface ClientCustodyInput {
  /** عهد هذا العميل التي يحق للمشاهد قراءتها. */
  balances: readonly UserBalance[];
  /** مصروفات هذا العميل التي يحق للمشاهد عرضها (للجميع، أو لنفسه فقط). */
  expenses: readonly Expense[];
  /** دليل المستخدمين إن كان للمشاهد حق قراءته (وإلا فارغ). */
  users?: readonly DirectoryUser[];
  expenseScope: 'all' | 'own' | 'none';
  viewerId: string | undefined;
  /** إن مُرّر: لا تُحتسب إلا عهد ومصروفات هذا العميل مهما كان ما في المدخلات. */
  clientId?: string;
}

/** مصروف خُصم من عهدة، كما يخرج من الدفتر. */
export interface ClientCustodyExpense {
  id: string;
  date: string;
  createdAt: string;
  description: string;
  category: ExpenseCategory;
  /** كامل قيمة المصروف (لا يُقسَّم). */
  amount: number;
  /** رصيد العهدة قبل هذا المصروف. */
  balanceBefore: number;
  /** رصيد العهدة بعده (بالسالب = عجز). */
  balanceAfter: number;
  /** الجزء الذي تجاوز رصيد العهدة. */
  overdrawnAmount: number;
  notes?: string;
  /** اسم العامل إن كان المصروف دفعة لعامل. */
  workerName?: string;
  invoiceNumber?: string;
  /** المصروف الأصلي. */
  expense: Expense;
}

export interface ClientCustodyCarry {
  amount: number;
  /** العهدة الأخرى المرتبطة (التي جاء منها العجز، أو التي رُحّل إليها). */
  otherId?: string;
  otherNumber?: number;
}

/** عهدة واحدة. الأرقام (المصروف والمتبقي...) صحيحة فقط حين `exact`. */
export interface ClientCustodyRow {
  /** معرّف الإيداع (`UserBalance.id`). */
  id: string;
  /** رقم العهدة لهذا المستخدم على هذا العميل: الأقدم = 1. */
  number: number;
  userKey: string;
  userName: string;
  date: string;
  createdAt: string;
  notes?: string;
  createdBy?: string;
  /** المبلغ الممنوح. */
  amount: number;
  exact: boolean;
  /** الرصيد الافتتاحي بعد خصم العجز السابق. */
  opening: number;
  spent: number;
  /** المتبقي (بالسالب = عجز قائم على هذه العهدة). */
  remaining: number;
  /** العجز القائم على هذه العهدة ولم يُرحَّل بعد (≥ 0). */
  overdrawn: number;
  /** المستهلك من المبلغ بما فيه العجز المخصوم (0 إلى 100). */
  usedPct: number;
  status: CustodyStatus | null;
  badge: CustodyBadge | null;
  /** عجز عهدة سابقة خُصم من هذه. */
  carryIn: ClientCustodyCarry | null;
  /** عجز هذه العهدة رُحّل إلى التالية. */
  carryOut: ClientCustodyCarry | null;
  /** من الأقدم إلى الأحدث. */
  expenses: ClientCustodyExpense[];
  /** سجل الإيداع الأصلي (للتعديل والحذف). */
  source: UserBalance;
}

export type ClientUserStatusKey = 'none' | 'hidden' | 'deficit' | 'finished' | 'low' | 'active';
export type ClientUserStatus = { key: ClientUserStatusKey; label: string; tone: CustodyTone | 'neutral' };

/** عهد مستخدم واحد على العميل. الحقول القديمة (given... exact) باقية كما يقرؤها بقية الصفحة. */
export interface ClientCustodyUser {
  /** معرّف المستخدم (UID)، أو اسمه لسجلات قديمة بلا معرّف. */
  key: string;
  /** UID موثّق (لاختيار المستخدم في النماذج)؛ غائب لحامل عهدة قديم لا يُعرف إلا باسمه. */
  userId?: string;
  name: string;
  /** مجموع الممنوح، صحيح دائماً. */
  given: number;
  /** المصروف من العهد (صحيح فقط حين `exact`). */
  spent: number;
  /** الممنوح − المصروف، بالسالب عند العجز (صحيح فقط حين `exact`). */
  remaining: number;
  /** المصروفات المخصومة من عهده، الأحدث أولاً. */
  expenses: Expense[];
  /** وقت أول عهدة. */
  minTime: string;
  /**
   * هل `spent` كامل: فقط حين يرى المشاهد كل مصروفات هذا المستخدم (مصروفات الجميع، أو عهدته ضد مصروفاته
   * هو). غير ذلك الصحيح هو `given` وحده، والشاشة تقول إن الباقي غير متاح.
   */
  exact: boolean;
  /** العجز القائم (≥ 0). */
  deficit: number;
  /** عجز انتقل بين العهد (ليس مصروفاً إضافياً). */
  carriedBetween: number;
  /** نسبة المصروف من الممنوح (0 إلى 100). */
  usedPct: number;
  status: ClientUserStatus;
  /** مصروفات للمستخدم سبقت أول عهدة فلم تُحتسب عليها. */
  beforeCustody: { count: number; amount: number };
  /** من الأقدم إلى الأحدث. */
  custodies: ClientCustodyRow[];
}

export interface ClientCustodyTotals {
  given: number;
  /** المصروف والمتبقي والعجز حقيقيّة فقط حين `exact`. */
  spent: number;
  remaining: number;
  deficit: number;
  holders: number;
  deficitUsers: number;
  custodies: number;
  /** كل الأسطر دقيقة: يمكن عرض المتبقي والمصروف كرقم واحد حقيقي للعميل. */
  exact: boolean;
}

export interface ClientCustody {
  /** مرتبون للقراءة: العجز أولاً، ثم الأكبر رصيداً، ثم الاسم. */
  users: ClientCustodyUser[];
  totals: ClientCustodyTotals;
}

/* ── Identity ───────────────────────────────────────────────────────────── */

interface Group {
  /** UID موثّق، أو غائب لحامل عهدة قديم لا يُعرف عنه إلا الاسم. */
  uid?: string;
  key: string;
  name: string;
  names: Set<string>;
  balances: UserBalance[];
}

/** وقت الحركة بنفس قاعدة الدفتر: createdAt ثم date، وإلا أقدم وقت ممكن. */
function timeOf(createdAt?: string, date?: string): number {
  for (const v of [createdAt, date]) {
    if (!v) continue;
    const t = dayjs(v);
    if (t.isValid()) return t.valueOf();
  }
  return 0;
}

const byDepositOrder = (a: UserBalance, b: UserBalance) =>
  timeOf(a.createdAt, a.date) - timeOf(b.createdAt, b.date) || (a.createdAt || '').localeCompare(b.createdAt || '') || a.id.localeCompare(b.id);

function clean(v: string | undefined): string {
  return (v ?? '').trim();
}

interface Identity {
  docToUid: Map<string, string>;
  nameToUid: Map<string, string>;
  dirByUid: Map<string, DirectoryUser>;
}

/** دليل المستخدمين: معرّف المستند وUID والاسم تشير كلها إلى شخص واحد. */
function identityOf(directory: readonly DirectoryUser[]): Identity {
  const docToUid = new Map<string, string>();
  const nameToUid = new Map<string, string>();
  const dirByUid = new Map<string, DirectoryUser>();
  directory.forEach((u) => {
    const uid = u.uid || u.id;
    docToUid.set(u.id, uid);
    dirByUid.set(uid, u);
    if (u.displayName) nameToUid.set(clean(u.displayName), uid);
  });
  return { docToUid, nameToUid, dirByUid };
}

/**
 * تجميع العهد بحسب صاحبها بنفس قاعدة الدفتر: المعرّف يحسم، والاسم يحسم فقط لسجل لا معرّف له
 * (قد يتشابه اسمان، وسجل يحمل معرّفاً آخر ليس لهذا الشخص أبداً).
 */
function groupHolders(balances: UserBalance[], { docToUid, nameToUid, dirByUid }: Identity): Group[] {
  const groups = new Map<string, Group>();
  const ensure = (key: string, uid: string | undefined): Group => {
    let g = groups.get(key);
    if (!g) {
      const known = uid ? dirByUid.get(uid) : undefined;
      g = { uid, key, name: clean(known?.displayName), names: new Set(), balances: [] };
      if (g.name) g.names.add(g.name);
      groups.set(key, g);
    }
    return g;
  };
  const add = (g: Group, b: UserBalance) => {
    g.balances.push(b);
    const n = clean(b.userName);
    if (n) g.names.add(n);
  };

  const sorted = [...balances].sort(byDepositOrder);
  // 1) سجلات بمعرّف
  sorted.forEach((b) => {
    const id = clean(b.userId);
    if (!id) return;
    const uid = docToUid.get(id) ?? id;
    add(ensure(uid, uid), b);
  });
  // 2) سجلات بالاسم فقط: تنضم لمن يحمل الاسم نفسه (دليلاً أو سجلاً)، وإلا تكوّن صاحبها بالاسم
  sorted.forEach((b) => {
    if (clean(b.userId)) return;
    const name = clean(b.userName);
    const dirUid = name ? nameToUid.get(name) : undefined;
    let target: Group | undefined;
    if (dirUid) target = ensure(dirUid, dirUid);
    else if (name) target = [...groups.values()].find((g) => g.names.has(name));
    if (!target) target = ensure(name || 'unknown', undefined);
    add(target, b);
  });

  const list = [...groups.values()];
  list.forEach((g) => {
    g.balances.sort(byDepositOrder);
    if (!g.name) {
      // أحدث اسم مسجّل على العهد (يعكس أي إعادة تسمية)
      const named = [...g.balances].reverse().find((b) => clean(b.userName));
      g.name = clean(named?.userName) || 'مستخدم';
    }
  });
  return list;
}

/** المجموعة التي يُحتسب مصروف عليها (واحدة على الأكثر فلا يُحتسب مرتين). */
function groupOfExpense(e: Expense, groups: Group[], docToUid: Map<string, string>): Group | undefined {
  const rawId = clean(e.userId);
  const uid = rawId ? (docToUid.get(rawId) ?? rawId) : undefined;
  const by = clean(e.createdBy);
  if (uid) {
    const hit = groups.find((g) => g.uid === uid);
    if (hit) return hit;
    // لا عهدة بهذا المعرّف: يقبله حامل عهدة قديم بالاسم فقط (كما يفعل الدفتر)
    return by ? groups.find((g) => !g.uid && g.names.has(by)) : undefined;
  }
  return by ? groups.find((g) => g.names.has(by)) : undefined;
}

/* ── Status ─────────────────────────────────────────────────────────────── */

function userStatus(rows: ClientCustodyRow[], remaining: number): ClientUserStatus {
  if (rows.length === 0) return { key: 'none', label: 'بدون عهدة', tone: 'neutral' };
  const r = toMilli(remaining);
  if (r < 0) return { key: 'deficit', label: 'عجز قائم', tone: 'danger' };
  if (r === 0) return { key: 'finished', label: 'عهدة منتهية', tone: 'warning' };
  // منخفضة: المتاح أقل من 30% من صافي العهد التي ما زال فيها رصيد.
  const pendingNet = rows
    .filter((c) => toMilli(c.remaining) > 0)
    .reduce((s, c) => s + Math.max(0, toMilli(c.opening)), 0);
  if (pendingNet > 0 && r < pendingNet * 0.3) return { key: 'low', label: 'رصيد منخفض', tone: 'warning' };
  return { key: 'active', label: 'نشطة', tone: 'success' };
}

/* ── Rows ───────────────────────────────────────────────────────────────── */

const sourceOnly = (g: Group, b: UserBalance, number: number): ClientCustodyRow => ({
  id: b.id,
  number,
  userKey: g.key,
  userName: g.name,
  date: b.date,
  createdAt: b.createdAt,
  notes: b.notes || undefined,
  createdBy: b.createdBy,
  amount: b.amount,
  exact: false,
  opening: b.amount,
  spent: 0,
  remaining: b.amount,
  overdrawn: 0,
  usedPct: 0,
  status: null,
  badge: null,
  carryIn: null,
  carryOut: null,
  expenses: [],
  source: b,
});

function rowFromLedger(
  g: Group,
  ledger: CustodyLedgerRow,
  number: number,
  numberById: Map<string, number>,
  source: UserBalance,
  originals: Map<string, Expense>,
): ClientCustodyRow {
  const amountMilli = toMilli(ledger.amount);
  const consumed = amountMilli - Math.max(0, toMilli(ledger.remaining));
  return {
    id: ledger.id,
    number,
    userKey: g.key,
    userName: g.name,
    date: source.date,
    createdAt: source.createdAt,
    notes: source.notes || undefined,
    createdBy: source.createdBy,
    amount: ledger.amount,
    exact: true,
    opening: subtractMoney(ledger.amount, ledger.carryOver),
    spent: ledger.spent,
    remaining: ledger.remaining,
    overdrawn: Math.max(0, -ledger.remaining),
    usedPct: amountMilli > 0 ? Math.min(100, Math.max(0, (consumed / amountMilli) * 100)) : 0,
    status: getCustodyStatus(ledger.remaining, ledger.amount, ledger.carryOver),
    badge: getCustodyBadge(ledger.remaining, ledger.carryOver),
    carryIn:
      toMilli(ledger.carryOver) > 0
        ? {
            amount: ledger.carryOver,
            otherId: ledger.carryFromId,
            otherNumber: ledger.carryFromId ? numberById.get(ledger.carryFromId) : undefined,
          }
        : null,
    carryOut:
      toMilli(ledger.carriedOut) > 0
        ? {
            amount: ledger.carriedOut,
            otherId: ledger.carryToId,
            otherNumber: ledger.carryToId ? numberById.get(ledger.carryToId) : undefined,
          }
        : null,
    expenses: ledger.expenses.map((e) => {
      const original = originals.get(e.id) ?? e;
      return {
        id: e.id,
        date: original.date,
        createdAt: original.createdAt,
        description: original.description,
        category: original.category,
        amount: e.usedAmount,
        balanceBefore: e.balanceBefore,
        balanceAfter: e.balanceAfter,
        overdrawnAmount: e.overdrawnAmount,
        notes: original.notes,
        workerName: original.workerId ? original.workerName || 'عامل' : undefined,
        invoiceNumber: original.invoiceNumber,
        expense: original,
      };
    }),
    source,
  };
}

function buildUser(
  g: Group,
  groupExpenses: Expense[],
  exact: boolean,
): ClientCustodyUser {
  const givenAll = sumMoney(g.balances.map((b) => b.amount));
  const minTime = g.balances[0]?.createdAt ?? '';

  if (!exact) {
    const custodies = g.balances.map((b, i) => sourceOnly(g, b, i + 1));
    return {
      key: g.key,
      userId: g.uid,
      name: g.name,
      given: givenAll,
      spent: 0,
      remaining: givenAll,
      expenses: [],
      minTime,
      exact: false,
      deficit: 0,
      carriedBetween: 0,
      usedPct: 0,
      status: { key: 'hidden', label: 'المصروف غير متاح لك', tone: 'neutral' },
      beforeCustody: { count: 0, amount: 0 },
      custodies,
    };
  }

  const deposits: GlobalFundTransaction[] = g.balances.map((b) => ({
    id: b.id,
    type: 'deposit',
    amount: b.amount,
    userId: g.uid ?? '',
    userName: g.name,
    description: '',
    date: b.date,
    notes: b.notes,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    createdBy: b.createdBy,
  }));
  // Normalised copies carry this holder's identity, so the ledger's ownership rule always matches them.
  const originals = new Map<string, Expense>(groupExpenses.map((e) => [e.id, e]));
  const normalised: Expense[] = groupExpenses.map((e) => ({ ...e, userId: g.uid, createdBy: g.name }));
  const ledger = buildUserCustodyLedger(deposits, normalised, { userId: g.uid, userName: g.name });

  const sourceById = new Map(g.balances.map((b) => [b.id, b]));
  const numberById = new Map(ledger.map((c, i) => [c.id, i + 1]));
  const custodies = ledger.map((c, i) => rowFromLedger(g, c, i + 1, numberById, sourceById.get(c.id)!, originals));

  const given = sumMoney(custodies.map((c) => c.amount));
  const spent = sumMoney(custodies.map((c) => c.spent));
  const remaining = subtractMoney(given, spent);
  const charged = new Set(custodies.flatMap((c) => c.expenses.map((e) => e.id)));
  const before = groupExpenses.filter((e) => !charged.has(e.id) && toMilli(e.amount) > 0);

  return {
    key: g.key,
    userId: g.uid,
    name: g.name,
    given,
    spent,
    remaining,
    expenses: custodies
      .flatMap((c) => c.expenses.map((e) => e.expense))
      .sort((a, b) => timeOf(b.createdAt, b.date) - timeOf(a.createdAt, a.date)),
    minTime,
    exact: true,
    deficit: Math.max(0, -remaining),
    carriedBetween: sumMoney(custodies.map((c) => c.carryOut?.amount ?? 0)),
    usedPct: toMilli(given) > 0 ? Math.min(100, Math.max(0, (toMilli(spent) / toMilli(given)) * 100)) : 0,
    status: userStatus(custodies, remaining),
    beforeCustody: { count: before.length, amount: sumMoney(before.map((e) => e.amount)) },
    custodies,
  };
}

/** العجز أولاً (الأكبر)، ثم الأكبر رصيداً متاحاً، ثم الاسم. غير الدقيق يُرتّب بالممنوح. */
function compareForList(a: ClientCustodyUser, b: ClientCustodyUser): number {
  const da = a.exact ? toMilli(a.deficit) : 0;
  const db = b.exact ? toMilli(b.deficit) : 0;
  if ((da > 0) !== (db > 0)) return da > 0 ? -1 : 1;
  if (da !== db) return db - da;
  const ra = a.exact ? Math.max(0, toMilli(a.remaining)) : toMilli(a.given);
  const rb = b.exact ? Math.max(0, toMilli(b.remaining)) : toMilli(b.given);
  if (ra !== rb) return rb - ra;
  return a.name.localeCompare(b.name, 'ar');
}

/**
 * العهدة التي سيُخصم منها المصروف القادم: أقدم عهدة لم تُغلق (ما زال فيها رصيد)، وإن نفدت كلها فآخرها
 * (يتراكم عليها العجز إلى أن تُمنح عهدة جديدة). تتبع قاعدة الدفتر نفسها.
 */
export function chargedCustody(rows: readonly ClientCustodyRow[]): ClientCustodyRow | undefined {
  return rows.find((c) => toMilli(c.remaining) > 0) ?? rows[rows.length - 1];
}

/** مجاميع العهد على العميل من أسطر المستخدمين (المصروف والمتبقي والعجز حقيقيّة فقط حين `exact`). */
export function summarizeClientCustody(list: readonly ClientCustodyUser[]): ClientCustodyTotals {
  return {
    given: sumMoney(list.map((u) => u.given)),
    spent: sumMoney(list.map((u) => u.spent)),
    remaining: sumMoney(list.map((u) => u.remaining)),
    deficit: sumMoney(list.map((u) => u.deficit)),
    holders: list.length,
    deficitUsers: list.filter((u) => u.exact && toMilli(u.deficit) > 0).length,
    custodies: list.reduce((n, u) => n + u.custodies.length, 0),
    exact: list.every((u) => u.exact),
  };
}

export function buildClientCustody({
  balances,
  expenses,
  users = [],
  expenseScope,
  viewerId,
  clientId,
}: ClientCustodyInput): ClientCustody {
  const scopedBalances = clientId ? balances.filter((b) => b.clientId === clientId) : [...balances];
  const scopedExpenses = clientId ? expenses.filter((e) => e.clientId === clientId) : [...expenses];

  const identity = identityOf(users);
  const groups = groupHolders(scopedBalances, identity);

  const assigned = new Map<Group, Expense[]>(groups.map((g) => [g, []]));
  scopedExpenses.forEach((e) => {
    const g = groupOfExpense(e, groups, identity.docToUid);
    if (g) assigned.get(g)!.push(e);
  });

  const list = groups
    .map((g) => {
      const exact = expenseScope === 'all' || (expenseScope === 'own' && !!g.uid && g.uid === viewerId);
      return buildUser(g, assigned.get(g) ?? [], exact);
    })
    .sort(compareForList);

  const totals = summarizeClientCustody(list);
  return { users: list, totals };
}
