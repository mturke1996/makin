import { doc, runTransaction, type Firestore } from 'firebase/firestore';
import { formatReceiptNumber, receiptCounterId } from '../core/finance/receipt';

export interface ReceiptIssuer {
  name: string;
}

/**
 * The receipt number of a payment, allocating the next one of the year the first time it is asked for.
 * The counter and the payment are written in one transaction, so two people issuing at once never get the
 * same number and a payment never has two. Asking again returns the number it already has.
 */
export async function ensureReceiptNumber(
  db: Firestore,
  paymentId: string,
  issuer: ReceiptIssuer,
  now: Date = new Date(),
): Promise<{ receiptNumber: string; issued: boolean }> {
  // Two people issuing at the same moment read the same counter value. The rules judge the second write against
  // the counter the first one just moved, so it can come back as `permission-denied` instead of a plain retry.
  // Reading again settles it; a person who truly may not issue is refused every time and the last error is thrown.
  const ATTEMPTS = 6;
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await allocate(db, paymentId, issuer, now);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (attempt >= ATTEMPTS || (code !== 'permission-denied' && code !== 'aborted')) throw error;
      await new Promise((resolve) => setTimeout(resolve, 25 * attempt));
    }
  }
}

function allocate(db: Firestore, paymentId: string, issuer: ReceiptIssuer, now: Date) {
  const paymentRef = doc(db, 'payments', paymentId);
  return runTransaction(db, async (tx) => {
    const payment = await tx.get(paymentRef);
    if (!payment.exists()) throw new Error('الدفعة غير موجودة');
    const existing = payment.data().receiptNumber;
    if (typeof existing === 'string' && existing) return { receiptNumber: existing, issued: false };

    const year = now.getFullYear();
    const counterRef = doc(db, 'counters', receiptCounterId(year));
    const counter = await tx.get(counterRef);
    const last = counter.exists() ? Number(counter.data().last) || 0 : 0;
    const next = last + 1;
    const receiptNumber = formatReceiptNumber(year, next);
    const stamp = now.toISOString();
    tx.set(counterRef, { last: next, updatedAt: stamp });
    tx.update(paymentRef, { receiptNumber, receiptIssuedAt: stamp, receiptIssuedBy: issuer.name });
    return { receiptNumber, issued: true };
  });
}
