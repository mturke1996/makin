import { createElement, useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { useAccess } from '../../../core/access/useAccess';
import { buildReceipt } from '../../../core/finance/receipt';
import { db } from '../../../config/firebase';
import { ensureReceiptNumber } from '../../../services/receiptNumber';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useDataStore } from '../../../stores/useDataStore';
import type { Payment } from '../../../types';

/** Resolves once the browser has painted and been idle for a moment. */
const afterPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 400)));

/**
 * Issues the receipt of a payment: allocates its number the first time (which needs `payments.manage`),
 * then builds the PDF from the payment as it is saved now, with the invoice it belongs to.
 * Someone who may only view payments can still reprint a receipt that already has its number.
 */
export function useReceipt() {
  const access = useAccess();
  const user = useAuthStore((s) => s.user);
  const [busyId, setBusyId] = useState<string | null>(null);
  const canIssue = access.can('payments.manage');

  /** The payment as the store holds it now (a sheet may still hold the copy it opened with). */
  const live = useCallback((payment: Payment): Payment => useDataStore.getState().payments.find((p) => p.id === payment.id) ?? payment, []);

  const issue = useCallback(
    async (payment: Payment, action: 'download' | 'share') => {
      setBusyId(payment.id);
      try {
        const current = live(payment);
        let number = current.receiptNumber;
        if (!number) {
          if (!canIssue) {
            toast.error('إصدار أول إيصال لهذه الدفعة يحتاج صلاحية إدارة المدفوعات');
            return;
          }
          number = (await ensureReceiptNumber(db, current.id, { name: user?.displayName || user?.email || 'المستخدم' })).receiptNumber;
        }
        const { clients, invoices, payments } = useDataStore.getState();
        const client = clients.find((c) => c.id === current.clientId);
        const receipt = buildReceipt({
          payment: { ...current, receiptNumber: number },
          number,
          client,
          invoice: invoices.find((i) => i.id === current.invoiceId),
          allPayments: payments,
          fallbackReceiver: user?.displayName,
          origin: window.location.origin,
        });
        // Laying out a PDF holds the main thread for a second or more on a phone. The sheet that took the payment
        // is allowed to close and repaint first, and the PDF code (large) is fetched only now, not at start-up.
        await afterPaint();
        const [{ downloadPdf, sharePdf }, { withDocumentLanguage }, { ReceiptPDF }] = await Promise.all([
          import('../../../features/pdf/pdfService'),
          import('../../../features/pdf/pdfI18n'),
          import('../../../features/pdf/ReceiptPDF'),
        ]);
        const element = withDocumentLanguage(createElement(ReceiptPDF, { receipt }), client);
        const file = `إيصال-${number}`;
        if (action === 'download') await downloadPdf(element, file);
        else await sharePdf(element, file, { title: `إيصال استلام ${number}`, text: `إيصال استلام ${number} بمبلغ ${receipt.amount.toLocaleString('en-US')} د.ل` });
      } catch (error) {
        console.error('receipt', error);
        toast.error('تعذّر إصدار الإيصال. تحقق من الاتصال وحاول مجدداً.');
      } finally {
        setBusyId(null);
      }
    },
    [canIssue, live, user],
  );

  return { issue, live, busyId, canIssue };
}
