import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useDataStore, useDataSlice } from '../../../stores/useDataStore';
import { useAccess } from '../../../core/access/useAccess';
import { EXPENSE_CLOSED_MESSAGE, isExpenseLocked } from '../../../core/finance/expenseLock';
import { formatCurrencyDisplay, formatDate } from '../../../core/utils-formatters';
import type {
  BoqLineItem,
  Client,
  Expense,
  Payment,
  PaymentMilestone,
  ProjectPhase,
  SiteReport,
  StandaloneDebt,
  UserBalance,
} from '../../../types';
import { useConfirm } from './useConfirm';

/**
 * Every delete of the client page behind one confirmation that says what goes away.
 * Pass `fromForm` when the delete was asked from an open edit form: that form closes after the dialog.
 */
export function useClientDeletes({ closeForm }: { closeForm: () => void }) {
  const navigate = useNavigate();
  const access = useAccess();
  const { ask, modal, isOpen: confirmOpen } = useConfirm();
  const { deleteExpense, deletePayment, deleteStandaloneDebt, deleteUserBalance, deleteProjectPhase, deleteBoqItem, deletePaymentMilestone, deleteSiteReport, deleteClient } = useDataSlice('deleteExpense', 'deletePayment', 'deleteStandaloneDebt', 'deleteUserBalance', 'deleteProjectPhase', 'deleteBoqItem', 'deletePaymentMilestone', 'deleteSiteReport', 'deleteClient');

  const afterClose = (fromForm?: boolean) => (fromForm ? closeForm : undefined);

  const expense = (e: Expense, fromForm?: boolean) =>
    isExpenseLocked(e) ? void toast.error(EXPENSE_CLOSED_MESSAGE) : ask({
      title: `حذف المصروف "${e.description}"؟`,
      description: `${formatCurrencyDisplay(e.amount)} بتاريخ ${formatDate(e.date)}`,
      details: (
        <>
          <p>يُحذف المصروف نهائياً من حساب العميل، وتتغير مجاميع المصروفات والعهدة تبعاً لذلك.</p>
          {e.workerId && <p className="mt-2">هذا المصروف دفعة لعامل، فيرجع مبلغه إلى المتبقي للعامل.</p>}
        </>
      ),
      confirmLabel: 'حذف المصروف',
      onConfirm: () => deleteExpense(e.id),
      afterClose: afterClose(fromForm),
    });

  const payment = (p: Payment, fromForm?: boolean) =>
    ask({
      title: 'حذف هذه الدفعة؟',
      description: `${formatCurrencyDisplay(p.amount)} بتاريخ ${formatDate(p.paymentDate)}`,
      details: <p>تُحذف الدفعة نهائياً من تحصيلات العميل، ويتغير رصيد حسابه.</p>,
      confirmLabel: 'حذف الدفعة',
      onConfirm: () => deletePayment(p.id),
      afterClose: afterClose(fromForm),
    });

  const debt = (d: StandaloneDebt, fromForm?: boolean) =>
    ask({
      title: `حذف دين ${d.partyName}؟`,
      description: `المتبقي ${formatCurrencyDisplay(d.remainingAmount)} من ${formatCurrencyDisplay(d.amount)}`,
      details: <p>يُحذف الدين وسجل سداده نهائياً، ولا يُحتسب بعد ذلك ضمن ديون العميل.</p>,
      confirmLabel: 'حذف الدين',
      onConfirm: () => deleteStandaloneDebt(d.id),
      afterClose: afterClose(fromForm),
    });

  const balance = (b: UserBalance, fromForm?: boolean) =>
    ask({
      title: `حذف عهدة ${b.userName}؟`,
      description: `${formatCurrencyDisplay(b.amount)} بتاريخ ${formatDate(b.date)}`,
      details: (
        <p>
          تُحذف العهدة نهائياً. المصروفات التي خُصمت منها لا تُحذف، بل يُعاد توزيعها على عهد الموظف الأخرى على هذا
          المشروع، وما لا تغطيه يظهر عجزاً عليه.
        </p>
      ),
      confirmLabel: 'حذف العهدة',
      onConfirm: () => deleteUserBalance(b.id),
      afterClose: afterClose(fromForm),
    });

  const phase = (p: ProjectPhase) =>
    ask({
      title: `حذف مرحلة "${p.name}"؟`,
      description: 'تُحذف المرحلة وميزانيتها.',
      details: <p>تبقى المصروفات المرتبطة بها في حساب العميل، لكنها لن تُنسب إلى مرحلة.</p>,
      confirmLabel: 'حذف المرحلة',
      onConfirm: () => deleteProjectPhase(p.id),
    });

  const boqItem = (i: BoqLineItem) =>
    ask({
      title: 'حذف هذا البند؟',
      description: i.description,
      details: <p>يُحذف البند نهائياً ويُخصم إجماليه من جدول الكميات.</p>,
      confirmLabel: 'حذف البند',
      onConfirm: () => deleteBoqItem(i.id),
    });

  const milestone = (m: PaymentMilestone) =>
    ask({
      title: `حذف «${m.title}» من الجدول؟`,
      description: `${formatCurrencyDisplay(m.amount)} تستحق في ${formatDate(m.dueDate)}`,
      details: <p>يُحذف موعد الدفعة وحدها. ما حصّلته من العميل يبقى مسجلاً في المدفوعات، ويُوزَّع على الدفعات المتبقية من الجدول.</p>,
      confirmLabel: 'حذف الدفعة',
      onConfirm: () => deletePaymentMilestone(m.id),
    });

  const siteReport = (r: SiteReport) =>
    ask({
      title: 'حذف هذا التقرير؟',
      description: `${r.title} بتاريخ ${formatDate(r.reportDate)}`,
      details: <p>يُحذف تقرير الموقع نهائياً.</p>,
      confirmLabel: 'حذف التقرير',
      onConfirm: () => deleteSiteReport(r.id),
    });

  const client = (c: Client) => {
    // Counted when asked, so the dialog tells the truth about what the cascade removes: it removes what
    // this device holds, which for anyone but an admin is only the part their permissions let them download.
    const s = useDataStore.getState();
    const linked = [
      ['مصروفات', s.expenses.filter((i) => i.clientId === c.id).length],
      ['دفعات', s.payments.filter((i) => i.clientId === c.id).length],
      ['فواتير', s.invoices.filter((i) => i.clientId === c.id).length],
      ['ديون', s.standaloneDebts.filter((i) => i.clientId === c.id).length],
      ['عمال', s.workers.filter((i) => i.clientId === c.id).length],
      ['حركات عهدة', s.userBalances.filter((i) => i.clientId === c.id).length],
    ].filter(([, n]) => (n as number) > 0);
    ask({
      title: `حذف العميل "${c.name}"؟`,
      description: 'يُحذف العميل وكل بياناته نهائياً ولا يمكن التراجع.',
      details: (
        <>
          <p>
            {linked.length > 0
              ? 'ستُحذف معه السجلات التالية:'
              : access.isAdmin
                ? 'لا توجد سجلات مرتبطة بهذا العميل.'
                : 'لا توجد سجلات مرتبطة بهذا العميل ضمن ما تراه.'}
          </p>
          {linked.length > 0 && (
            <ul className="mt-2 space-y-1">
              {linked.map(([label, n]) => (
                <li key={label as string}>
                  <bdi dir="ltr" className="tabular-nums font-semibold text-fg">
                    {n as number}
                  </bdi>{' '}
                  {label}
                </li>
              ))}
            </ul>
          )}
          {!access.isAdmin && (
            <p className="mt-2">قد توجد سجلات أخرى مرتبطة بهذا العميل لا تظهر لك بحكم صلاحياتك، ولن تُحذف معه.</p>
          )}
        </>
      ),
      confirmLabel: 'حذف العميل نهائياً',
      onConfirm: async () => {
        await deleteClient(c.id);
        navigate('/clients');
      },
    });
  };

  return { expense, payment, debt, balance, phase, boqItem, milestone, siteReport, client, modal, confirmOpen };
}
