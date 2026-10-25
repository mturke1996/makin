import type { Expense, Payment } from '../../types';
import { toMilli } from './money';

/**
 * Checking a printed document. The QR code on a receipt or a payment voucher is a link to `/verify` that carries
 * the document's reference, amount and date plus a short checksum.
 *
 * Two layers, and they answer different questions:
 *  - the checksum tells anyone, signed in or not, that the figures on the link were not retyped or altered;
 *    it is NOT a secret signature (the app has no server to keep one), so it never replaces the second layer;
 *  - the match against the company's own records, which only signed-in staff can read, tells whether the
 *    document really was issued and for that amount and day.
 */

export type DocKind = 'receipt' | 'voucher';

const KIND_CODE: Record<DocKind, string> = { receipt: 'RC', voucher: 'WPV' };
const CODE_KIND: Record<string, DocKind> = { RC: 'receipt', WPV: 'voucher' };

export const KIND_LABEL: Record<DocKind, string> = { receipt: 'إيصال استلام', voucher: 'إيصال صرف لعامل' };

export interface VerifyClaim {
  kind: DocKind;
  ref: string;
  /** Three decimals, as printed. */
  amount: string;
  /** YYYY-MM-DD */
  date: string;
  check: string;
}

const day = (value?: string) => (value ?? '').slice(0, 10);

/** The reference printed on a worker's payment voucher: the day plus the end of the expense id. */
export function workerVoucherRef(payment: { id: string; day: string }): string {
  return `MK-WPV-${(payment.day || '00000000').replace(/-/g, '')}-${payment.id.slice(-4).toUpperCase()}`;
}

/** FNV-1a over the fields: 8 hex characters. Enough to catch a changed digit, not an adversary. */
function checksum(kind: DocKind, ref: string, amount: string, date: string): string {
  const text = ['makin', KIND_CODE[kind], ref, amount, date].join('|');
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function buildClaim(kind: DocKind, ref: string, amount: number, date: string): VerifyClaim {
  const printed = amount.toFixed(3);
  const d = day(date);
  return { kind, ref, amount: printed, date: d, check: checksum(kind, ref, printed, d) };
}

/** What the QR code carries. `origin` is the address the app is served from (empty gives a relative link). */
export function verifyUrl(claim: VerifyClaim, origin = ''): string {
  const q = new URLSearchParams({ k: KIND_CODE[claim.kind], r: claim.ref, a: claim.amount, d: claim.date, s: claim.check });
  return `${origin.replace(/\/$/, '')}/verify?${q.toString()}`;
}

export const verifyQr = (kind: DocKind, ref: string, amount: number, date: string, origin = '') => verifyUrl(buildClaim(kind, ref, amount, date), origin);

export function parseClaim(params: URLSearchParams): VerifyClaim | null {
  const kind = CODE_KIND[params.get('k') ?? ''];
  const ref = params.get('r')?.trim();
  const amount = params.get('a')?.trim();
  const date = params.get('d')?.trim();
  const check = params.get('s')?.trim();
  if (!kind || !ref || !amount || !date || !check) return null;
  if (!/^\d+(\.\d{1,3})?$/.test(amount) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return { kind, ref, amount, date, check };
}

/** Do the figures on the link still agree with the checksum printed with them? */
export const claimIntact = (claim: VerifyClaim) => checksum(claim.kind, claim.ref, claim.amount, claim.date) === claim.check;

export type RecordMatch =
  | { status: 'match'; who: string }
  | { status: 'different'; differences: ('amount' | 'date')[]; recorded: { amount: number; date: string } }
  | { status: 'not-found' };

/** The document against what the company has recorded. Amounts are compared in thousandths. */
export function matchRecords(claim: VerifyClaim, data: { payments: readonly Payment[]; expenses: readonly Expense[] }, clientName: (id: string) => string = () => ''): RecordMatch {
  let recorded: { amount: number; date: string; who: string } | undefined;
  if (claim.kind === 'receipt') {
    const p = data.payments.find((x) => x.receiptNumber === claim.ref);
    if (p) recorded = { amount: p.amount, date: day(p.paymentDate), who: clientName(p.clientId) };
  } else {
    const e = data.expenses.find((x) => {
      if (!x.workerId) return false;
      const d = day(x.date) || day(x.createdAt);
      return workerVoucherRef({ id: x.id, day: d }) === claim.ref;
    });
    if (e) recorded = { amount: e.amount, date: day(e.date) || day(e.createdAt), who: clientName(e.clientId ?? '') };
  }
  if (!recorded) return { status: 'not-found' };
  const differences: ('amount' | 'date')[] = [];
  if (toMilli(recorded.amount) !== toMilli(Number(claim.amount))) differences.push('amount');
  if (recorded.date !== claim.date) differences.push('date');
  return differences.length === 0 ? { status: 'match', who: recorded.who } : { status: 'different', differences, recorded: { amount: recorded.amount, date: recorded.date } };
}
