import dayjs from 'dayjs';
import type { Expense, GlobalFundTransaction } from '../../types';
import { roundMoney } from './money';
export { roundMoney };

export type CustodyExpenseRow = Expense & {
  /** المبلغ المحسوب على هذه العهدة — دائماً كامل قيمة المصروف (لا يُقسَّم المصروف أبداً). */
  usedAmount: number;
  clientName?: string;
  /** رصيد العهدة قبل هذا المصروف. */
  balanceBefore: number;
  /** رصيد العهدة بعد هذا المصروف (بالسالب = عجز). */
  balanceAfter: number;
  /** الجزء من المصروف الذي تجاوز رصيد العهدة (صار عجزاً). */
  overdrawnAmount: number;
};

export type CustodyLedgerRow = {
  id: string;
  createdAt: string;
  amount: number;
  /** الرصيد = المبلغ − العجز المخصوم − المصروف + العجز المُرحّل للتالية. */
  remaining: number;
  /** مجموع مصروفات هذه العهدة بقيمتها الكاملة. */
  spent: number;
  /** عجز عهدة سابقة خُصم من هذه العهدة (سطر تسوية واحد). */
  carryOver: number;
  carryFromId?: string;
  /** عجز هذه العهدة الذي رُحّل ليُخصم من العهدة التالية. */
  carriedOut: number;
  carryToId?: string;
  debtRolledOut: boolean;
  expenses: CustodyExpenseRow[];
};

export type CustodyBucket = CustodyLedgerRow;

export type CustodyExpenseUse = {
  expense: Expense;
  usedAmount: number;
  clientName?: string;
};

export type CustodyTotals = {
  deposited: number;
  spent: number;
  remaining: number;
};

type UserMatch = {
  userId?: string;
  userName?: string;
};

function resolveUserKey(tx: { userId?: string; userName?: string }): string {
  return (tx.userId || tx.userName || 'unknown').trim();
}

function matchesUser(tx: { userId?: string; userName?: string }, user: UserMatch): boolean {
  const uid = user.userId?.trim();
  const name = user.userName?.trim();
  if (uid && tx.userId === uid) return true;
  // The name identifies a record only when one side has no id to compare: two people can share
  // a first name, and a record that carries a different userId is never theirs.
  if (name && tx.userName === name && (!tx.userId || !uid)) return true;
  return false;
}

function matchesExpenseUser(exp: Expense, user: UserMatch): boolean {
  const uid = user.userId?.trim();
  const name = user.userName?.trim();
  if (uid && exp.userId === uid) return true;
  if (name && exp.createdBy === name && (!exp.userId || !uid)) return true;
  return false;
}

/** وقت الحركة للترتيب الزمني — createdAt ثم date، وإلا أقدم وقت ممكن. */
function eventTime(createdAt?: string, date?: string): number {
  for (const v of [createdAt, date]) {
    if (!v) continue;
    const t = dayjs(v);
    if (t.isValid()) return t.valueOf();
  }
  return 0;
}

function syncRemaining(c: CustodyLedgerRow): void {
  c.remaining = roundMoney(c.amount - c.carryOver - c.spent + c.carriedOut);
}

/**
 * بناء دفتر عهدات مستخدم واحد — العهد تُستهلك بالترتيب، والمصروف لا يُقسَّم:
 * - كل مصروف يُسجَّل بكامل قيمته في سطر واحد على العهدة الجارية (أقدم عهدة لم تُغلق).
 * - إن تجاوز رصيدها صار الفرق عجزاً عليها.
 * - العجز يُرحّل مبلغاً واحداً إلى العهدة التالية (فور منحها، أو فوراً إن كانت ممنوحة)
 *   ويظهر فيها كسطر "خصم عجز" — دون نقل أجزاء من المصروفات.
 */
export function buildUserCustodyLedger(
  deposits: GlobalFundTransaction[],
  expenses: Expense[],
  user: UserMatch,
  clientMap?: Record<string, string>,
): CustodyLedgerRow[] {
  type LedgerEvent =
    | { t: number; kind: 0; order: number; tx: GlobalFundTransaction }
    | { t: number; kind: 1; order: number; exp: Expense };

  const events: LedgerEvent[] = [];
  deposits
    .filter((t) => t.type === 'deposit' && matchesUser(t, user))
    .forEach((tx, order) => events.push({ t: eventTime(tx.createdAt, tx.date), kind: 0, order, tx }));

  if (events.length === 0) return [];

  expenses
    .filter((e) => matchesExpenseUser(e, user))
    .forEach((exp, order) => events.push({ t: eventTime(exp.createdAt, exp.date), kind: 1, order, exp }));

  // العهدة الممنوحة في نفس لحظة المصروف تُحسب قبله.
  events.sort((a, b) => a.t - b.t || a.kind - b.kind || a.order - b.order);

  const custodies: CustodyLedgerRow[] = [];
  /** العهدة الجارية التي تُسجَّل عليها المصروفات. */
  let active = 0;

  /** يغلق كل عهدة نفد رصيدها ما دامت هناك عهدة تالية، ويرحّل عجزها إليها. */
  const settle = () => {
    while (active < custodies.length - 1 && custodies[active].remaining <= 0) {
      const current = custodies[active];
      const next = custodies[active + 1];
      const deficit = roundMoney(-current.remaining);
      if (deficit > 0) {
        current.carriedOut = roundMoney(current.carriedOut + deficit);
        current.carryToId = next.id;
        current.debtRolledOut = true;
        next.carryOver = roundMoney(next.carryOver + deficit);
        next.carryFromId = current.id;
        syncRemaining(current);
        syncRemaining(next);
      }
      active += 1;
    }
  };

  events.forEach((ev) => {
    if (ev.kind === 0) {
      const amount = roundMoney(ev.tx.amount);
      custodies.push({
        id: ev.tx.id,
        createdAt: ev.tx.createdAt,
        amount,
        remaining: amount,
        spent: 0,
        carryOver: 0,
        carriedOut: 0,
        debtRolledOut: false,
        expenses: [],
      });
      settle();
      return;
    }

    // مصروف قبل أول عهدة لا يُحسب على العهد.
    if (custodies.length === 0) return;

    const exp = ev.exp;
    const value = roundMoney(exp.amount);
    if (!(value > 0)) return;

    const custody = custodies[active];
    const balanceBefore = custody.remaining;
    custody.spent = roundMoney(custody.spent + value);
    syncRemaining(custody);
    custody.expenses.push({
      ...exp,
      usedAmount: value,
      clientName: exp.clientId ? clientMap?.[exp.clientId] || 'عميل' : 'مصروف عام',
      balanceBefore,
      balanceAfter: custody.remaining,
      overdrawnAmount: roundMoney(Math.min(value, Math.max(0, -custody.remaining))),
    });
    settle();
  });

  return custodies;
}

/**
 * لمعاينة مصروف قبل حفظه: كم من قيمته يغطيه الرصيد المتاح وكم يصبح عجزاً.
 * (المصروف نفسه يُسجَّل كاملاً في سطر واحد — هذا للعرض فقط.)
 */
export function splitAgainstCustody(
  available: number,
  amount: number,
): { fromBalance: number; deficit: number } {
  const value = roundMoney(amount);
  if (!(value > 0)) return { fromBalance: 0, deficit: 0 };
  const fromBalance = roundMoney(Math.min(value, Math.max(0, roundMoney(available))));
  return { fromBalance, deficit: roundMoney(value - fromBalance) };
}

export type UserCustodyView = {
  key: string;
  name: string;
  uid: string;
  userName: string;
  custodies: Array<
    CustodyLedgerRow & {
      ref: string;
      /** رقم العهدة التي جاء منها العجز المخصوم. */
      carryFromRef?: string;
      /** رقم العهدة التي رُحّل إليها العجز. */
      carryToRef?: string;
      date: string;
      description: string;
      notes?: string;
      _raw: GlobalFundTransaction;
    }
  >;
};

/**
 * بناء عهدات كل المستخدمين — للعرض في FundPage (مطابق Etlala).
 */
export function buildAllUsersCustodyLedger(
  transactions: GlobalFundTransaction[],
  expenses: Expense[],
  userMap: Record<string, string>,
  clientMap?: Record<string, string>,
): UserCustodyView[] {
  const byUser: Record<string, UserCustodyView> = {};

  const deposits = [...transactions.filter((t) => t.type === 'deposit')].sort((a, b) =>
    dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf(),
  );

  deposits.forEach((tx) => {
    const key = resolveUserKey(tx);
    if (!byUser[key]) {
      byUser[key] = {
        key,
        name: userMap[tx.userId || ''] || tx.userName || 'مستخدم',
        uid: tx.userId || '',
        userName: tx.userName || userMap[tx.userId || ''] || '',
        custodies: [],
      };
    }
  });

  Object.values(byUser).forEach((userData) => {
    const ledger = buildUserCustodyLedger(
      transactions,
      expenses,
      { userId: userData.uid, userName: userData.userName || userData.name },
      clientMap,
    );

    // الرقم يُعدّ لكل مستخدم على حدة (EHD-001 هي أول عهدة له): فيراه المدير والموظف نفسه برقم واحد،
    // ولا يتغير رقم عهدة موظف لأن عهدة موظف آخر حُذفت. الموظف لا يحمّل عهد غيره أصلاً.
    let nextRef = 1;
    const refById: Record<string, string> = {};
    ledger.forEach((row) => {
      const tx = deposits.find((d) => d.id === row.id);
      if (!tx) return;
      const ref = `EHD-${String(nextRef++).padStart(3, '0')}`;
      refById[row.id] = ref;
      userData.custodies.push({
        ...row,
        ref,
        date: tx.date,
        description: tx.description,
        notes: tx.notes,
        _raw: tx,
      });
    });
    userData.custodies.forEach((c) => {
      if (c.carryFromId) c.carryFromRef = refById[c.carryFromId];
      if (c.carryToId) c.carryToRef = refById[c.carryToId];
    });
  });

  return Object.values(byUser).filter((u) => u.custodies.length > 0);
}

/**
 * إجماليات عهد المستخدم (إيداع / مصروف / متبقٍ) — للملخصات.
 */
export function computeUserFundAllocTotals(
  depositRows: { createdAt: string; amount: number }[],
  expenseRows: { createdAt: string; amount: number }[],
): CustodyTotals {
  if (depositRows.length === 0) {
    if (expenseRows.length === 0) {
      return { deposited: 0, spent: 0, remaining: 0 };
    }
    const totalExp = roundMoney(
      expenseRows.reduce((s, e) => s + (Number.isFinite(e.amount) ? e.amount : 0), 0),
    );
    return { deposited: 0, spent: totalExp, remaining: -totalExp };
  }

  const pseudoDeposits: GlobalFundTransaction[] = depositRows.map((d, i) => ({
    id: `dep-${i}`,
    type: 'deposit',
    amount: d.amount,
    userId: 'u',
    userName: 'u',
    description: '',
    date: d.createdAt.slice(0, 10),
    notes: '',
    createdAt: d.createdAt,
    updatedAt: d.createdAt,
    createdBy: '',
  }));

  const pseudoExpenses: Expense[] = expenseRows.map((e, i) => ({
    id: `exp-${i}`,
    clientId: '',
    description: '',
    amount: e.amount,
    category: 'materials',
    date: e.createdAt.slice(0, 10),
    createdAt: e.createdAt,
    updatedAt: e.createdAt,
    createdBy: 'u',
    userId: 'u',
    isClosed: false,
  }));

  const ledger = buildUserCustodyLedger(pseudoDeposits, pseudoExpenses, { userId: 'u', userName: 'u' });
  return custodyTotals(ledger);
}

/** @deprecated use buildUserCustodyLedger */
export function computeCustodyFifo(
  deposits: GlobalFundTransaction[],
  expenses: Expense[],
  user: UserMatch,
  clientMap?: Record<string, string>,
): CustodyBucket[] {
  return buildUserCustodyLedger(deposits, expenses, user, clientMap);
}

export function custodyTotals(custodies: CustodyLedgerRow[]): CustodyTotals {
  return {
    deposited: roundMoney(custodies.reduce((s, c) => s + c.amount, 0)),
    spent: roundMoney(custodies.reduce((s, c) => s + c.spent, 0)),
    remaining: roundMoney(custodies.reduce((s, c) => s + c.remaining, 0)),
  };
}
