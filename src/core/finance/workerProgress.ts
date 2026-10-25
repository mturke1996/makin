import { fromMilli, toMilli } from './money';

/**
 * الإنجاز مقابل المدفوع للعامل.
 *
 * المشرف يعتمد نسبة إنجاز العمل (من 0 إلى 100)، فيكون المستحَق بالإنجاز = المتفق عليه × النسبة.
 * كل ما دُفع للعامل (سلفاً كان أو دفعة عادية) يُحسب من هذا المستحَق، فالسلفة تُخصم تلقائياً:
 * المستحق الآن = المنجز − المدفوع. وما دُفع فوق المنجز هو «مدفوع مقدماً» ويُنبَّه إليه.
 * كل المقارنات بالآلاف الصحيحة.
 */

/** مدفوع مقدماً يبلغ هذه النسبة من الاتفاق أو أكثر يصير تنبيهاً عاجلاً. */
export const FAR_AHEAD_SHARE = 0.2;

export type WorkerProgressState = 'unset' | 'ok' | 'ahead' | 'far_ahead';

export interface WorkerProgressView {
  /** النسبة المعتمدة، أو null إن لم تُعتمد بعد. */
  percent: number | null;
  /** المستحَق بالإنجاز. */
  earned: number;
  paid: number;
  /** ما يستحقه العامل الآن بعد خصم كل ما قبض (السلف داخلة فيه). */
  payableNow: number;
  /** ما دُفع فوق المنجز. */
  aheadBy: number;
  /** مجموع الدفعات المعلَّمة سلفاً. */
  advances: number;
  /** من السلف ما لم يغطِّه الإنجاز بعد (لا يزيد على المدفوع مقدماً). */
  advanceOutstanding: number;
  /** من السلف ما غطّاه الإنجاز فصار محسوماً. */
  advanceSettled: number;
  state: WorkerProgressState;
}

/** نسبة صالحة (0 إلى 100، بخانة عشرية واحدة)، أو null لقيمة غير صالحة. */
export function normalizePercent(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 10) / 10;
}

export function workerProgressView(input: {
  agreed: number;
  paid: number;
  percent?: number | null;
  advances?: number;
}): WorkerProgressView {
  const percent = normalizePercent(input.percent);
  const agreed = toMilli(input.agreed);
  const paid = toMilli(input.paid);
  const advances = Math.max(0, toMilli(input.advances ?? 0));
  const earned = percent === null ? 0 : Math.round((agreed * Math.round(percent * 10)) / 1000);
  const ahead = percent === null ? 0 : Math.max(0, paid - earned);
  const outstanding = Math.min(advances, ahead);

  let state: WorkerProgressState = 'unset';
  if (percent !== null) state = ahead === 0 ? 'ok' : ahead >= agreed * FAR_AHEAD_SHARE ? 'far_ahead' : 'ahead';

  return {
    percent,
    earned: fromMilli(earned),
    paid: fromMilli(paid),
    payableNow: percent === null ? 0 : fromMilli(Math.max(0, earned - paid)),
    aheadBy: fromMilli(ahead),
    advances: fromMilli(advances),
    advanceOutstanding: fromMilli(outstanding),
    advanceSettled: fromMilli(advances - outstanding),
    state,
  };
}

/** بعد دفعة جديدة (أو معدَّلة): كم يتجاوز مجموع المدفوع المنجز؟ 0 إن لم تُعتمد نسبة أو لم يحدث تجاوز. */
export function exceedsEarnedBy(view: WorkerProgressView, amount: number, replacing = 0): number {
  if (view.percent === null) return 0;
  const after = toMilli(view.paid) - toMilli(replacing) + toMilli(amount);
  return fromMilli(Math.max(0, after - toMilli(view.earned)));
}

/** Total of the payments marked as advances. */
export function advanceTotal(payments: readonly { amount: number; expense: { isWorkerAdvance?: boolean } }[]): number {
  let total = 0;
  for (const p of payments) if (p.expense.isWorkerAdvance) total += toMilli(p.amount);
  return fromMilli(total);
}
