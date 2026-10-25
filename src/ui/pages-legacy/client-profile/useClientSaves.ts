import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { useDataStore } from '../../../stores/useDataStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { computeBoqLineTotal } from '../../../core/finance/projectBudget';
import { clearField } from '../../../services/firebaseService';
import { readProfitPercentage } from '../../../core/finance/profitRule';
import { expenseHasQuantityLine, parseDecimalInput } from '../../../core/utils-formatters';
import type {
  BoqLineItem,
  ClientProfitBase,
  Expense,
  ExpenseCategory,
  Payment,
  PaymentMilestone,
  ProjectPhase,
  SiteReport,
  StandaloneDebt,
  UserBalance,
} from '../../../types';
import type {
  BalanceFormValues,
  BoqFormValues,
  ClientFormValues,
  DebtFormValues,
  ExpenseFormValues,
  MilestoneFormValues,
  PaymentFormValues,
  PhaseFormValues,
  SiteReportFormValues,
} from './schemas';
import type { SystemUser } from './types';
import { buildProjectPatch } from './details/clientFields';

export type ProfileSheetKey =
  | 'expenses'
  | 'payments'
  | 'schedule'
  | 'debts'
  | 'workers'
  | 'balances'
  | 'phases'
  | 'boq'
  | 'siteReports'
  | 'invoices'
  | 'letters'
  | 'activity'
  | 'statement';

interface Options {
  clientId: string | undefined;
  systemUsers: SystemUser[];
  /** Close the open form; when a sheet is given, land on that sheet so the new record is in view. */
  afterSave: (sheet: ProfileSheetKey | null) => void;
  /** Phases the next order number is derived from. */
  phaseCount: number;
  /** Instalments the next order number is derived from. */
  milestoneCount: number;
}

/**
 * Create / update handlers of every form on the client page. Each one builds the record exactly
 * as the old inline handlers did, calls the store, and closes the form only when the save worked
 * (the store already toasts a failure, so the form stays open with what was typed).
 */
export function useClientSaves({ clientId, systemUsers, afterSave, phaseCount, milestoneCount }: Options) {
  const user = useAuthStore((s) => s.user);
  const {
    workers,
    updateClient,
    addPayment,
    updatePayment,
    addExpense,
    updateExpense,
    addStandaloneDebt,
    updateStandaloneDebt,
    addUserBalance,
    updateUserBalance,
    addProjectPhase,
    updateProjectPhase,
    addBoqItem,
    updateBoqItem,
    addPaymentMilestone,
    addPaymentMilestones,
    updatePaymentMilestone,
    addSiteReport,
    updateSiteReport,
  } = useDataStore();

  const author = user?.displayName || 'المستخدم';
  const nowIso = () => new Date().toISOString();

  const attempt = async (save: () => Promise<void>, sheet: ProfileSheetKey | null): Promise<boolean> => {
    try {
      await save();
      afterSave(sheet);
      return true;
    } catch {
      return false;
    }
  };

  const savePayment = (edit: Payment | null | undefined, data: PaymentFormValues) =>
    attempt(async () => {
      const amount = parseDecimalInput(data.amount) ?? 0;
      const paymentMethod = data.paymentMethod as Payment['paymentMethod'];
      if (edit) {
        await updatePayment(edit.id, { amount, paymentMethod, paymentDate: data.paymentDate, notes: data.notes });
      } else {
        const now = nowIso();
        await addPayment({
          id: crypto.randomUUID(),
          invoiceId: '',
          clientId: clientId!,
          amount,
          paymentMethod,
          paymentDate: data.paymentDate,
          notes: data.notes || '',
          createdAt: now,
          updatedAt: now,
          createdBy: author,
        });
      }
    }, 'payments');

  const saveExpense = (edit: Expense | null | undefined, data: ExpenseFormValues) =>
    attempt(async () => {
      const amount = parseDecimalInput(data.amount) ?? 0;
      const quantity = parseDecimalInput(data.quantity);
      const unitPrice = parseDecimalInput(data.unitPrice);
      const workerId = data.workerId || undefined;
      // People without `workers.view` have no worker list: an expense that already names its worker keeps the name.
      const workerName = workerId
        ? (workers.find((w) => w.id === workerId)?.name ?? (edit?.workerId === workerId ? edit.workerName : undefined))
        : undefined;
      const phaseId = data.phaseId || undefined;
      const hasQuantity = expenseHasQuantityLine({ quantity, unitPrice });
      const unit = data.unit.trim() || undefined;

      if (edit) {
        // Firestore strips undefined fields, so a link or quantity line the user removed is cleared with
        // null / zeros (the same convention the expenses page uses).
        const cleared = null as unknown as undefined;
        await updateExpense(edit.id, {
          description: data.description.trim(),
          amount,
          category: data.category as ExpenseCategory,
          date: data.date,
          invoiceNumber: data.invoiceNumber,
          notes: data.notes,
          workerId: workerId ?? cleared,
          workerName: workerName ?? cleared,
          phaseId: phaseId ?? cleared,
          ...(hasQuantity ? { quantity, unitPrice, unit: unit ?? '' } : { quantity: 0, unitPrice: 0, unit: '' }),
          updatedAt: nowIso(),
          // The owner (userId, createdBy) is set once, at creation: the rules refuse a change of owner.
        });
      } else {
        if (!user?.id) {
          toast.error('تعذّر تحديد حسابك، أعد تسجيل الدخول ثم حاول مجدداً');
          throw new Error('no-user');
        }
        const now = nowIso();
        await addExpense({
          id: crypto.randomUUID(),
          clientId: clientId!,
          description: data.description.trim(),
          amount,
          category: data.category as ExpenseCategory,
          date: data.date,
          invoiceNumber: data.invoiceNumber || '',
          notes: data.notes,
          isClosed: false,
          phaseId,
          ...(hasQuantity ? { quantity, unitPrice, unit } : {}),
          createdAt: now,
          updatedAt: now,
          workerId,
          workerName,
          userId: user.id,
          createdBy: author,
        });
      }
    }, 'expenses');

  const saveDebt = (edit: StandaloneDebt | null | undefined, data: DebtFormValues) =>
    attempt(async () => {
      const amount = parseDecimalInput(data.amount) ?? 0;
      if (edit) {
        const paidAmount = Math.min(edit.paidAmount, amount);
        const remainingAmount = Math.max(0, amount - paidAmount);
        await updateStandaloneDebt(edit.id, {
          partyName: data.partyName.trim(),
          description: data.description,
          amount,
          paidAmount,
          remainingAmount,
          status: remainingAmount <= 0 ? 'paid' : 'unpaid',
          date: data.date,
          notes: data.notes,
        });
      } else {
        const now = nowIso();
        await addStandaloneDebt({
          id: crypto.randomUUID(),
          clientId: clientId!,
          partyType: 'external',
          partyName: data.partyName.trim(),
          description: data.description,
          amount,
          paidAmount: 0,
          remainingAmount: amount,
          status: 'unpaid',
          date: data.date,
          notes: data.notes || '',
          createdAt: now,
          updatedAt: now,
        });
      }
    }, 'debts');

  const saveBalance = (edit: UserBalance | null | undefined, data: BalanceFormValues) =>
    attempt(async () => {
      const amount = parseDecimalInput(data.amount) ?? 0;
      const assigned = systemUsers.find((u) => (u.uid || u.id) === data.userId);
      const userName = assigned?.displayName || author;
      if (edit) {
        await updateUserBalance(edit.id, { userId: data.userId, userName, amount, date: data.date, notes: data.notes });
      } else {
        const now = nowIso();
        await addUserBalance({
          id: crypto.randomUUID(),
          clientId: clientId!,
          userId: data.userId,
          userName,
          amount,
          date: data.date,
          notes: data.notes || '',
          createdAt: now,
          updatedAt: now,
          createdBy: author,
        });
      }
    }, 'balances');

  const savePhase = (edit: ProjectPhase | null | undefined, data: PhaseFormValues) =>
    attempt(async () => {
      const now = nowIso();
      const budgetAmount = data.budgetAmount ? parseFloat(String(data.budgetAmount)) : undefined;
      const fields = {
        name: data.name,
        status: data.status as ProjectPhase['status'],
        budgetAmount,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        notes: data.notes || undefined,
      };
      if (edit) {
        await updateProjectPhase(edit.id, { ...fields, order: parseInt(String(data.order), 10) || 0, updatedAt: now });
      } else {
        await addProjectPhase({
          id: crypto.randomUUID(),
          clientId: clientId!,
          ...fields,
          order: parseInt(String(data.order), 10) || phaseCount + 1,
          createdAt: now,
          updatedAt: now,
          createdBy: author,
        });
      }
    }, 'phases');

  const saveBoq = (edit: BoqLineItem | null | undefined, data: BoqFormValues) =>
    attempt(async () => {
      const quantity = parseFloat(String(data.quantity)) || 0;
      const unitPrice = parseFloat(String(data.unitPrice)) || 0;
      const now = nowIso();
      const fields = {
        itemCode: data.itemCode || undefined,
        description: data.description,
        unit: data.unit,
        quantity,
        unitPrice,
        total: computeBoqLineTotal(quantity, unitPrice),
        phaseId: data.phaseId || undefined,
        // Clearing a category on an existing line removes it (Firestore strips undefined, so null is the way).
        category: data.category || (edit?.category ? (null as unknown as undefined) : undefined),
        notes: data.notes || undefined,
      };
      if (edit) {
        await updateBoqItem(edit.id, { ...fields, updatedAt: now });
      } else {
        await addBoqItem({
          id: crypto.randomUUID(),
          clientId: clientId!,
          ...fields,
          createdAt: now,
          updatedAt: now,
          createdBy: author,
        });
      }
    }, 'boq');

  const saveMilestone = (edit: PaymentMilestone | null | undefined, data: MilestoneFormValues) =>
    attempt(async () => {
      const now = nowIso();
      const fields = {
        title: data.title.trim(),
        amount: parseDecimalInput(data.amount) ?? 0,
        dueDate: data.dueDate,
        order: parseInt(String(data.order), 10) || milestoneCount + 1,
        notes: data.notes?.trim() || (edit?.notes ? (null as unknown as undefined) : undefined),
      };
      if (edit) {
        await updatePaymentMilestone(edit.id, { ...fields, updatedAt: now });
      } else {
        await addPaymentMilestone({
          id: crypto.randomUUID(),
          clientId: clientId!,
          ...fields,
          createdAt: now,
          updatedAt: now,
          createdBy: author,
        });
      }
    }, 'schedule');

  /** The "split the contract" shortcut: several instalments created together, numbered after the existing ones. */
  const saveSchedule = (drafts: readonly { title: string; amount: number; dueDate: string }[]) =>
    attempt(async () => {
      const now = nowIso();
      await addPaymentMilestones(
        drafts.map((draft, i) => ({
          id: crypto.randomUUID(),
          clientId: clientId!,
          title: draft.title,
          amount: draft.amount,
          dueDate: draft.dueDate,
          order: milestoneCount + i + 1,
          createdAt: now,
          updatedAt: now,
          createdBy: author,
        })),
      );
    }, 'schedule');

  const saveSiteReport = (edit: SiteReport | null | undefined, data: SiteReportFormValues) => {
    if (!data.workCompleted?.trim()) {
      toast.error('أدخل الأعمال المنفذة');
      return Promise.resolve(false);
    }
    return attempt(async () => {
      const now = nowIso();
      const payload = {
        title: data.title.trim(),
        reportDate: dayjs(data.reportDate).toISOString(),
        weather: data.weather?.trim() || undefined,
        workersOnSite: data.workersOnSite ? parseInt(String(data.workersOnSite), 10) : undefined,
        progressPercent: data.progressPercent ? parseFloat(String(data.progressPercent)) : undefined,
        workCompleted: data.workCompleted.trim(),
        issues: data.issues?.trim() || undefined,
        nextSteps: data.nextSteps?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
        updatedAt: now,
      };
      if (edit) {
        await updateSiteReport(edit.id, payload);
      } else {
        await addSiteReport({
          id: crypto.randomUUID(),
          clientId: clientId!,
          ...payload,
          createdAt: now,
          createdBy: author,
        });
      }
    }, 'siteReports');
  };

  const saveClient = (data: ClientFormValues) =>
    attempt(async () => {
      if (!clientId) return;
      // The project fields are typed text in the form: they are parsed here, and an emptied one removes the field.
      await updateClient(clientId, {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        type: data.type,
        ...buildProjectPatch(data, 'update', clearField),
      });
    }, null);

  /** Agreed percentage + its base: from 0 up to (not including) 100; an emptied field removes the percentage. */
  const saveProfit = async (percentage: string, base: ClientProfitBase): Promise<boolean> => {
    if (!clientId) return false;
    const read = readProfitPercentage(percentage);
    if (!read.ok) {
      toast.error(read.message);
      return false;
    }
    const pct = read.value;
    return attempt(async () => {
      await updateClient(clientId, { profitPercentage: pct, profitBase: base });
      window.dispatchEvent(new Event('profitPercentageUpdated'));
    }, null);
  };

  return {
    savePayment,
    saveExpense,
    saveDebt,
    saveBalance,
    savePhase,
    saveBoq,
    saveMilestone,
    saveSchedule,
    saveSiteReport,
    saveClient,
    saveProfit,
  };
}
