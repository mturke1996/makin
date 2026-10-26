import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import {
  clientsService,
  invoicesService,
  paymentsService,
  expensesService,
  standaloneDebtsService,
  debtPartiesService,
  expenseInvoicesService,
  workersService,
  userBalancesService,
  lettersService,
  projectPhasesService,
  boqItemsService,
  siteReportsService,
  paymentMilestonesService,
  workerAttendanceService,
  suppliersService,
  globalFundTransactionsService,
  createExpenseInvoiceAtomic,
  deleteExpenseInvoiceAtomic,
  toConstraints,
} from '../services/firebaseService';
import { db } from '../config/firebase';
import { SLOW_NETWORK_MESSAGE, boundOnline, queuedWrites } from '../services/writeAck';
import { deleteStorageFileByUrl } from '../services/storageService';
import type {
  Client,
  Invoice,
  Payment,
  Expense,
  StandaloneDebt,
  DebtParty,
  ExpenseInvoice,
  Worker,
  UserBalance,
  Letter,
  ProjectPhase,
  BoqLineItem,
  SiteReport,
  PaymentMilestone,
  WorkerAttendance,
  Supplier,
} from '../types';
import toast from 'react-hot-toast';
import { useNotificationStore } from './useNotificationStore';
import { formatFirebaseError } from '../core/formatFirebaseError';
import { writeAuditLog } from '../services/auditService';
import {
  deriveInvoiceStatus,
  deriveDebtStatus,
  sumInvoicePayments,
} from '../core/finance/invoicePayments';
import { addMoney, subtractMoney } from '../core/finance/money';
import { EXPENSE_CLOSED_MESSAGE, isExpenseLocked } from '../core/finance/expenseLock';
import { approvalDecision, approvalFieldsForNew, approvalPatchOnEdit, type ApprovalActor } from '../core/finance/expenseApproval';
import { buildPrincipal, can } from '../core/access/principal';
import { useAuthStore } from './useAuthStore';
import { SOURCES, mergeById, planFor, sortRecords, type DataKey } from '../core/access/dataPlan';
import type { Principal } from '../core/access/principal';

// ─── localStorage cache (instant paint) ───────────────────────
// The cache is only reused for the SAME person with the SAME permissions; anything else is dropped,
// so one user's records can never appear on the screen of another.
const CACHE_PREFIX = 'app-cache-';
const CACHE_OWNER_KEY = 'app-cache-owner';
type StoreKey = Exclude<DataKey, 'fundTransactions'>;
const CACHE_KEYS: readonly StoreKey[] = ['clients', 'invoices', 'payments', 'expenses', 'expenseInvoices', 'standaloneDebts', 'debtParties', 'workers', 'userBalances', 'letters', 'projectPhases', 'boqItems', 'siteReports', 'paymentMilestones', 'workerAttendance', 'suppliers'];

const SERVICES: Record<StoreKey, { subscribe: (cb: (data: any[]) => void, c?: any[], onError?: (e: any) => void) => () => void }> = {
  clients: clientsService,
  invoices: invoicesService,
  payments: paymentsService,
  expenses: expensesService,
  expenseInvoices: expenseInvoicesService,
  standaloneDebts: standaloneDebtsService,
  debtParties: debtPartiesService,
  workers: workersService,
  userBalances: userBalancesService,
  letters: lettersService,
  projectPhases: projectPhasesService,
  boqItems: boqItemsService,
  siteReports: siteReportsService,
  paymentMilestones: paymentMilestonesService,
  workerAttendance: workerAttendanceService,
  suppliers: suppliersService,
};

const cacheOwnerTag = (principal: Principal | null) => (principal ? `${principal.id}|${JSON.stringify(planFor(principal))}` : '');

const loadCache = (key: string): any[] => {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const dropCache = () => {
  CACHE_KEYS.forEach((key) => {
    clearTimeout(saveCacheTimers[key]);
    try { localStorage.removeItem(CACHE_PREFIX + key); } catch {}
  });
  try { localStorage.removeItem(CACHE_OWNER_KEY); } catch {}
};

/** How long snapshots are gathered before the store is set once for all of them. */
export const SNAPSHOT_BATCH_MS = 30;

// Debounced save to avoid excessive writes
const saveCacheTimers: Record<string, any> = {};
const saveCache = (key: string, data: any[]) => {
  clearTimeout(saveCacheTimers[key]);
  // Serialising a whole collection is synchronous work: it waits for an idle moment instead of landing in the middle
  // of a save or a scroll. A longer pause also merges the two snapshots every write produces into one.
  saveCacheTimers[key] = setTimeout(() => {
    const write = () => { try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data)); } catch {} };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(write, { timeout: 4000 });
    else write();
  }, 1500);
};

/** The signed-in person as the approval rules see them. */
const approvalActor = (): ApprovalActor => {
  const user = useAuthStore.getState().user;
  return {
    id: user?.id ?? '',
    name: user?.displayName || user?.email || 'مستخدم',
    canApprove: can(buildPrincipal(user), 'expenses.edit.all'),
  };
};

/** Approval fields are decided here, never by a form: a screen cannot hand itself an approved expense. */
const APPROVAL_KEYS = ['approvalStatus', 'reviewedBy', 'reviewedByName', 'reviewedAt', 'rejectionReason'] as const;
const withoutApproval = (data: Partial<Expense>): Partial<Expense> => {
  const rest = { ...data };
  for (const key of APPROVAL_KEYS) delete rest[key];
  return rest;
};

// Helper: toast + in-app activity feed + clearer Firebase error text
const handleAsync = async (operation: () => Promise<any>, successMessage: string) => {
  const queuedBefore = queuedWrites();
  try {
    await operation();
    // The server had not answered when the change was let go: it is saved on this device and goes up by itself.
    const message = queuedWrites() > queuedBefore ? `${successMessage}، وسيُرفع تلقائياً عند توفر اتصال جيد` : successMessage;
    toast.success(message, { duration: queuedWrites() > queuedBefore ? 5000 : undefined });
    useNotificationStore.getState().push({ type: 'success', title: message });
    void writeAuditLog({ summary: successMessage });
  } catch (error) {
    console.error(error);
    const msg = formatFirebaseError(error);
    toast.error(msg);
    useNotificationStore.getState().push({ type: 'error', title: msg });
    throw error;
  }
};

interface DataState {
  clients: Client[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  expenseInvoices: ExpenseInvoice[];
  standaloneDebts: StandaloneDebt[];
  debtParties: DebtParty[];
  workers: Worker[];
  userBalances: UserBalance[];
  letters: Letter[];
  projectPhases: ProjectPhase[];
  boqItems: BoqLineItem[];
  siteReports: SiteReport[];
  paymentMilestones: PaymentMilestone[];
  workerAttendance: WorkerAttendance[];
  suppliers: Supplier[];
  isLoading: boolean;

  // Initialization
  /** Subscribes to exactly what this person may download (see core/access/dataPlan). Returns the unsubscribe. */
  initialize: (principal: Principal | null) => () => void;
  /** Forget everything in memory and in the localStorage cache (logout). */
  reset: () => void;

  // Actions
  addClient: (client: Client) => Promise<void>;
  updateClient: (id: string, data: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;

  addInvoice: (invoice: Invoice) => Promise<void>;
  updateInvoice: (id: string, data: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;

  addPayment: (payment: Payment) => Promise<void>;
  updatePayment: (id: string, data: Partial<Payment>) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
  
  addExpense: (expense: Expense) => Promise<void>;
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  /** Approver only (the rules refuse anyone else). Locked expenses are skipped. */
  approveExpenses: (ids: string[]) => Promise<void>;
  /** Approver only. A rejection must say why. */
  rejectExpense: (id: string, reason: string) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  
  addExpenseInvoice: (invoice: ExpenseInvoice) => Promise<void>;
  updateExpenseInvoice: (id: string, data: Partial<ExpenseInvoice>) => Promise<void>;
  deleteExpenseInvoice: (id: string) => Promise<void>;
  createExpenseInvoiceBatch: (params: {
    clientId: string;
    expenseIds: string[];
    invoiceNumber: string;
    notes?: string;
    createdBy: string;
  }) => Promise<void>;

  addStandaloneDebt: (debt: StandaloneDebt) => Promise<void>;
  updateStandaloneDebt: (id: string, data: Partial<StandaloneDebt>) => Promise<void>;
  payStandaloneDebt: (id: string, payAmount: number) => Promise<void>;
  deleteStandaloneDebt: (id: string) => Promise<void>;

  addDebtParty: (party: DebtParty) => Promise<void>;
  updateDebtParty: (id: string, data: Partial<DebtParty>) => Promise<void>;
  deleteDebtParty: (id: string) => Promise<void>;

  addWorker: (worker: Worker) => Promise<void>;
  updateWorker: (id: string, data: Partial<Worker>, expectedUpdatedAt?: string) => Promise<void>;
  deleteWorker: (id: string) => Promise<void>;

  addUserBalance: (balance: UserBalance) => Promise<void>;
  updateUserBalance: (id: string, data: Partial<UserBalance>) => Promise<void>;
  deleteUserBalance: (id: string) => Promise<void>;

  addLetter: (letter: Letter) => Promise<void>;
  updateLetter: (id: string, data: Partial<Letter>) => Promise<void>;
  deleteLetter: (id: string) => Promise<void>;

  addProjectPhase: (phase: ProjectPhase) => Promise<void>;
  updateProjectPhase: (id: string, data: Partial<ProjectPhase>) => Promise<void>;
  deleteProjectPhase: (id: string) => Promise<void>;

  addBoqItem: (item: BoqLineItem) => Promise<void>;
  updateBoqItem: (id: string, data: Partial<BoqLineItem>) => Promise<void>;
  deleteBoqItem: (id: string) => Promise<void>;

  addPaymentMilestone: (milestone: PaymentMilestone) => Promise<void>;
  /** Several instalments in one go (the "split the contract" shortcut). */
  addPaymentMilestones: (milestones: PaymentMilestone[]) => Promise<void>;
  updatePaymentMilestone: (id: string, data: Partial<PaymentMilestone>) => Promise<void>;
  deletePaymentMilestone: (id: string) => Promise<void>;

  /** One record per worker per day (the id is fixed), so marking a day again changes it. Quiet: no toast per tap. */
  markAttendance: (record: WorkerAttendance) => Promise<void>;
  clearAttendance: (id: string) => Promise<void>;

  addSupplier: (supplier: Supplier) => Promise<void>;
  updateSupplier: (id: string, data: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  addSiteReport: (report: SiteReport) => Promise<void>;
  updateSiteReport: (id: string, data: Partial<SiteReport>) => Promise<void>;
  deleteSiteReport: (id: string) => Promise<void>;
}

async function syncInvoiceStatusFromPayments(
  invoiceId: string,
  getState: () => DataState
): Promise<void> {
  if (!invoiceId) return;
  const { invoices, payments } = getState();
  const invoice = invoices.find((i) => i.id === invoiceId);
  if (!invoice) return;

  const paid = sumInvoicePayments(payments, invoiceId);
  const nextStatus = deriveInvoiceStatus(invoice, paid);
  if (nextStatus === invoice.status) return;

  await invoicesService.update(invoiceId, {
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  });
}

export const useDataStore = create<DataState>((set, get) => ({
  // ─── Load cached data instantly on store creation ──────────
  clients: [],
  invoices: [],
  payments: [],
  expenses: [],
  expenseInvoices: [],
  standaloneDebts: [],
  debtParties: [],
  workers: [],
  userBalances: [],
  letters: [],
  projectPhases: [],
  boqItems: [],
  siteReports: [],
  paymentMilestones: [],
  workerAttendance: [],
  suppliers: [],
  isLoading: true,

  reset: () => {
    dropCache();
    set({
      clients: [], invoices: [], payments: [], expenses: [], expenseInvoices: [], standaloneDebts: [],
      debtParties: [], workers: [], userBalances: [], letters: [], projectPhases: [], boqItems: [],
      siteReports: [], paymentMilestones: [], workerAttendance: [], suppliers: [], isLoading: true,
    });
  },

  initialize: (principal) => {
    const plan = planFor(principal);
    const planned = CACHE_KEYS.filter((key) => plan[key].length > 0);

    // Start from the cache only when it was written for this same person and plan.
    const tag = cacheOwnerTag(principal);
    let cacheValid = false;
    try { cacheValid = !!tag && localStorage.getItem(CACHE_OWNER_KEY) === tag; } catch {}
    if (!cacheValid) {
      dropCache();
      try { if (tag) localStorage.setItem(CACHE_OWNER_KEY, tag); } catch {}
    }
    const initial: Partial<Record<StoreKey, any[]>> = {};
    for (const key of CACHE_KEYS) initial[key] = plan[key].length > 0 && cacheValid ? loadCache(key) : [];
    const hasCachedData = planned.some((key) => (initial[key] ?? []).length > 0);
    set({ ...initial, isLoading: planned.length > 0 && !hasCachedData } as Partial<DataState>);

    // Snapshots of the fourteen collections arrive one after another, often within a few milliseconds of each other
    // (the cache answers them all at start-up). Setting the store for each one re-renders every screen that reads it
    // fourteen times in a row; the patches are collected and applied together instead, and «loading» ends in the
    // same patch as the last data, so a screen never shows an empty list between the two.
    let patch: Partial<DataState> = {};
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      flushTimer = null;
      const next = patch;
      patch = {};
      if (Object.keys(next).length > 0) set(next);
    };
    const queue = (next: Partial<DataState>) => {
      Object.assign(patch, next);
      if (flushTimer === null) flushTimer = setTimeout(flush, SNAPSHOT_BATCH_MS);
    };

    // Every query of every planned data set must report once before we stop showing "loading".
    const pending = new Set<string>(planned.flatMap((key) => plan[key].map((_, i) => `${key}:${i}`)));
    const settle = (id: string) => {
      pending.delete(id);
      if (pending.size === 0) queue({ isLoading: false });
    };

    const unsubs: Array<() => void> = [];
    for (const key of planned) {
      const queries = plan[key];
      const parts: any[][] = queries.map(() => []);
      queries.forEach((spec, i) => {
        const id = `${key}:${i}`;
        unsubs.push(
          SERVICES[key].subscribe(
            (rows) => {
              parts[i] = rows;
              const merged = sortRecords(mergeById(parts), SOURCES[key].sort);
              queue({ [key]: merged } as Partial<DataState>);
              saveCache(key, merged);
              settle(id);
            },
            toConstraints(spec),
            (error) => {
              // Refused by the rules or offline: keep what we have and stop waiting on this query.
              console.warn(`[data] ${key} subscription failed:`, error?.code || error?.message);
              settle(id);
            },
          ),
        );
      });
    }

    // Timeout fallback: if data doesn't load in 8s, stop showing loading
    const timeout = setTimeout(() => queue({ isLoading: false }), 8000);
    return () => {
      clearTimeout(timeout);
      if (flushTimer !== null) clearTimeout(flushTimer);
      unsubs.forEach((u) => u());
    };
  },

  // Client Actions
  addClient: async (client) => {
    await handleAsync(() => clientsService.add(client), 'تم إضافة العميل بنجاح');
  },
  updateClient: async (id, data) => {
    await handleAsync(() => clientsService.update(id, data), 'تم تحديث بيانات العميل');
  },
  deleteClient: async (id) => {
    await handleAsync(async () => {
      const state = get();

      const relatedExpenses = state.expenses.filter((i) => i.clientId === id);
      const relatedInvoices = state.invoices.filter((i) => i.clientId === id);
      const relatedInvoiceIds = new Set(relatedInvoices.map((invoice) => invoice.id));
      const relatedPayments = state.payments.filter((payment) => payment.clientId === id || relatedInvoiceIds.has(payment.invoiceId));
      const relatedDebts = state.standaloneDebts.filter((i) => i.clientId === id);
      const relatedWorkers = state.workers.filter((i) => i.clientId === id);
      const relatedBalances = state.userBalances.filter((i) => i.clientId === id);
      const relatedPhases = state.projectPhases.filter((i) => i.clientId === id);
      const relatedBoq = state.boqItems.filter((i) => i.clientId === id);
      const relatedMilestones = state.paymentMilestones.filter((i) => i.clientId === id);
      const relatedAttendance = state.workerAttendance.filter((i) => i.clientId === id);
      const relatedSiteReports = state.siteReports.filter((i) => i.clientId === id);
      const relatedLetters = state.letters.filter((i) => i.clientId === id);
      const relatedExpenseInvoices = state.expenseInvoices.filter((i) => i.clientId === id);
      const relatedDebtParties = state.debtParties.filter((i) => i.clientId === id);

      await Promise.all([
        ...relatedExpenses.map(async (item) => {
          void deleteStorageFileByUrl(item.attachmentUrl);
          await expensesService.delete(item.id);
        }),
        ...relatedPayments.map((item) => paymentsService.delete(item.id)),
        ...relatedInvoices.map((item) => invoicesService.delete(item.id)),
        ...relatedDebts.map((item) => standaloneDebtsService.delete(item.id)),
        ...relatedWorkers.map((item) => workersService.delete(item.id)),
        ...relatedBalances.map((item) => userBalancesService.delete(item.id)),
        ...relatedPhases.map((item) => projectPhasesService.delete(item.id)),
        ...relatedBoq.map((item) => boqItemsService.delete(item.id)),
        ...relatedMilestones.map((item) => paymentMilestonesService.delete(item.id)),
        ...relatedAttendance.map((item) => workerAttendanceService.delete(item.id)),
        ...relatedSiteReports.map((item) => siteReportsService.delete(item.id)),
        ...relatedLetters.map((item) => lettersService.delete(item.id)),
        ...relatedExpenseInvoices.map((item) => expenseInvoicesService.delete(item.id)),
        ...relatedDebtParties.map((item) => debtPartiesService.delete(item.id)),
      ]);

      // Fund transactions linked to client (if any)
      try {
        const fundTxs = await boundOnline(globalFundTransactionsService.getAll(), 5000, SLOW_NETWORK_MESSAGE);
        const relatedFund = fundTxs.filter((t) => t.clientId === id);
        await Promise.all(relatedFund.map((t) => globalFundTransactionsService.delete(t.id)));
      } catch {
        /* fund collection may be empty */
      }

      await clientsService.delete(id);
    }, 'تم حذف العميل وجميع بياناته نهائياً من النظام');
  },

  // Invoice Actions
  addInvoice: async (invoice) => {
    await handleAsync(() => invoicesService.add(invoice), 'تم إنشاء الفاتورة بنجاح');
  },
  updateInvoice: async (id, data) => {
    await handleAsync(() => invoicesService.update(id, data), 'تم تحديث الفاتورة');
  },
  deleteInvoice: async (id) => {
    await handleAsync(async () => {
      const relatedPayments = get().payments.filter((p) => p.invoiceId === id);
      await Promise.all(relatedPayments.map((p) => paymentsService.delete(p.id)));
      await invoicesService.delete(id);
    }, 'تم حذف الفاتورة ومدفوعاتها نهائياً');
  },

  // Payment Actions
  addPayment: async (payment) => {
    await handleAsync(async () => {
      await paymentsService.add(payment);
      const { invoices, payments } = get();
      const invoice = invoices.find((i) => i.id === payment.invoiceId);
      if (!invoice) return;
      const inStore = payments.some((p) => p.id === payment.id);
      const paid = sumInvoicePayments(
        inStore ? payments : [...payments, payment],
        payment.invoiceId
      );
      const nextStatus = deriveInvoiceStatus(invoice, paid);
      if (nextStatus !== invoice.status) {
        await invoicesService.update(payment.invoiceId, {
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        });
      }
    }, 'تم تسجيل الدفعة بنجاح');
  },
  updatePayment: async (id, data) => {
    await handleAsync(async () => {
      const prev = get().payments.find((p) => p.id === id);
      await paymentsService.update(id, { ...data, updatedAt: new Date().toISOString() });
      const ids = new Set([prev?.invoiceId, data.invoiceId].filter(Boolean) as string[]);
      for (const invoiceId of ids) {
        await syncInvoiceStatusFromPayments(invoiceId, get);
      }
    }, 'تم تحديث الدفعة');
  },
  deletePayment: async (id) => {
    await handleAsync(async () => {
      const prev = get().payments.find((p) => p.id === id);
      await paymentsService.delete(id);
      if (prev?.invoiceId) {
        const remaining = get().payments.filter((p) => p.id !== id);
        const invoice = get().invoices.find((i) => i.id === prev.invoiceId);
        if (invoice) {
          const paid = sumInvoicePayments(remaining, prev.invoiceId);
          const nextStatus = deriveInvoiceStatus(invoice, paid);
          if (nextStatus !== invoice.status) {
            await invoicesService.update(prev.invoiceId, {
              status: nextStatus,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }
    }, 'تم حذف الدفعة');
  },

  // Expense Actions
  addExpense: async (expense) => {
    // The same operation id always gets the same approval fields, so a retry is still the same submission.
    const stamped: Expense = { ...withoutApproval(expense), ...approvalFieldsForNew(approvalActor(), expense.createdAt) } as Expense;
    await handleAsync(() => expensesService.addConfirmedOnce(stamped), 'تم تسجيل المصروف بنجاح');
  },
  updateExpense: async (id, data) => {
    await handleAsync(async () => {
      const existing = get().expenses.find((e) => e.id === id);
      if (isExpenseLocked(existing)) throw new Error(EXPENSE_CLOSED_MESSAGE);
      // A change by anyone who cannot approve sends an approved or rejected expense back to review.
      const sendBack = existing ? approvalPatchOnEdit(existing, approvalActor()) : {};
      await expensesService.update(id, { ...withoutApproval(data), ...sendBack });
    }, 'تم تحديث المصروف');
  },
  approveExpenses: async (ids) => {
    const targets = get().expenses.filter((e) => ids.includes(e.id) && !isExpenseLocked(e));
    if (targets.length === 0) return;
    const message = targets.length === 1 ? `تم اعتماد المصروف «${targets[0].description}»` : `تم اعتماد ${targets.length} مصروفاً`;
    await handleAsync(async () => {
      const now = new Date().toISOString();
      const decision = approvalDecision('approved', approvalActor(), now);
      for (const e of targets) await expensesService.update(e.id, { ...decision, updatedAt: now });
    }, message);
  },
  rejectExpense: async (id, reason) => {
    const target = get().expenses.find((e) => e.id === id);
    if (!target) throw new Error('المصروف غير موجود');
    if (isExpenseLocked(target)) throw new Error(EXPENSE_CLOSED_MESSAGE);
    const now = new Date().toISOString();
    const decision = approvalDecision('rejected', approvalActor(), now, reason);
    await handleAsync(() => expensesService.update(id, { ...decision, updatedAt: now }), `تم رفض المصروف «${target.description}»`);
  },
  deleteExpense: async (id) => {
    await handleAsync(async () => {
      const exp = get().expenses.find((e) => e.id === id);
      if (isExpenseLocked(exp)) throw new Error(EXPENSE_CLOSED_MESSAGE);
      // An old attachment is removed in the background: it must not hold the delete up (and it never fails the delete).
      void deleteStorageFileByUrl(exp?.attachmentUrl);
      await expensesService.delete(id);
    }, 'تم حذف المصروف نهائياً');
  },

  // Expense Invoice Actions
  addExpenseInvoice: async (invoice) => {
    await handleAsync(() => expenseInvoicesService.add(invoice), 'تم إنشاء فاتورة المصروفات');
  },
  updateExpenseInvoice: async (id, data) => {
    await handleAsync(() => expenseInvoicesService.update(id, data), 'تم تحديث فاتورة المصروفات');
  },
  deleteExpenseInvoice: async (id) => {
    await handleAsync(() => boundOnline(deleteExpenseInvoiceAtomic(db, id), 15000, SLOW_NETWORK_MESSAGE), 'تم حذف فاتورة المصروفات وإعادة فتح مصروفاتها');
  },
  createExpenseInvoiceBatch: async ({ clientId, expenseIds, invoiceNumber, notes, createdBy }) => {
    await handleAsync(() => boundOnline(createExpenseInvoiceAtomic(db, {
      id: crypto.randomUUID(), clientId, expenseIds, invoiceNumber, notes, createdBy,
    }), 15000, SLOW_NETWORK_MESSAGE), 'تم إنشاء فاتورة المصروفات المجمعة');
  },

  // Standalone Debt Actions
  addStandaloneDebt: async (debt) => {
    await handleAsync(() => standaloneDebtsService.add(debt), 'تم تسجيل الدين بنجاح');
  },
  updateStandaloneDebt: async (id, data) => {
    await handleAsync(() => standaloneDebtsService.update(id, data), 'تم تحديث الدين');
  },
  payStandaloneDebt: async (id, payAmount: number) => {
    await handleAsync(async () => {
      const debt = get().standaloneDebts.find((d) => d.id === id);
      if (!debt) throw new Error('الدين غير موجود');
      const paidAmount = Math.min(debt.amount, addMoney(debt.paidAmount, payAmount));
      const remainingAmount = Math.max(0, subtractMoney(debt.amount, paidAmount));
      const status = deriveDebtStatus(debt.amount, paidAmount, debt.dueDate);
      await standaloneDebtsService.update(id, {
        paidAmount,
        remainingAmount,
        status,
        updatedAt: new Date().toISOString(),
      });
    }, 'تم تسجيل السداد');
  },
  deleteStandaloneDebt: async (id) => {
    await handleAsync(() => standaloneDebtsService.delete(id), 'تم حذف الدين');
  },

  // Debt Party Actions
  addDebtParty: async (party) => {
    await handleAsync(() => debtPartiesService.add(party), 'تم إضافة الطرف بنجاح');
  },
  updateDebtParty: async (id, data) => {
    await handleAsync(() => debtPartiesService.update(id, data), 'تم تحديث بيانات الطرف');
  },
  deleteDebtParty: async (id) => {
    await handleAsync(() => debtPartiesService.delete(id), 'تم حذف الطرف');
  },

  // Worker Actions
  addWorker: async (worker) => {
    await handleAsync(() => workersService.add(worker), 'تم إضافة العامل بنجاح');
  },
  updateWorker: async (id, data, expectedUpdatedAt) => {
    await handleAsync(() => expectedUpdatedAt !== undefined
      ? workersService.updateIfUnchanged(id, data, expectedUpdatedAt)
      : workersService.update(id, data), 'تم تحديث بيانات العامل');
  },
  deleteWorker: async (id) => {
    await handleAsync(() => workersService.delete(id), 'تم حذف العامل');
  },

  // User Balance Actions
  addUserBalance: async (balance) => {
    await handleAsync(() => userBalancesService.add(balance), 'تم إضافة الرصيد للمستخدم بنجاح');
  },
  updateUserBalance: async (id, data) => {
    await handleAsync(() => userBalancesService.update(id, data), 'تم تحديث الرصيد بنجاح');
  },
  deleteUserBalance: async (id) => {
    await handleAsync(() => userBalancesService.delete(id), 'تم حذف الرصيد');
  },

  // Letter Actions
  addLetter: async (letter) => {
    await handleAsync(() => lettersService.add(letter), '');
  },
  updateLetter: async (id, data) => {
    await handleAsync(() => lettersService.update(id, data), '');
  },
  deleteLetter: async (id) => {
    await handleAsync(() => lettersService.delete(id), '');
  },

  addProjectPhase: async (phase) => {
    await handleAsync(() => projectPhasesService.add(phase), 'تم إضافة المرحلة');
  },
  updateProjectPhase: async (id, data) => {
    await handleAsync(() => projectPhasesService.update(id, data), 'تم تحديث المرحلة');
  },
  deleteProjectPhase: async (id) => {
    await handleAsync(() => projectPhasesService.delete(id), 'تم حذف المرحلة');
  },

  addBoqItem: async (item) => {
    await handleAsync(() => boqItemsService.add(item), 'تم إضافة البند');
  },
  updateBoqItem: async (id, data) => {
    await handleAsync(() => boqItemsService.update(id, data), 'تم تحديث البند');
  },
  deleteBoqItem: async (id) => {
    await handleAsync(() => boqItemsService.delete(id), 'تم حذف البند');
  },

  addPaymentMilestone: async (milestone) => {
    await handleAsync(() => paymentMilestonesService.add(milestone), 'تمت إضافة الدفعة إلى الجدول');
  },
  addPaymentMilestones: async (milestones) => {
    await handleAsync(
      () => Promise.all(milestones.map((m) => paymentMilestonesService.add(m))),
      `تم إنشاء جدول من ${milestones.length} دفعات`,
    );
  },
  updatePaymentMilestone: async (id, data) => {
    await handleAsync(() => paymentMilestonesService.update(id, data), 'تم تحديث الدفعة');
  },
  deletePaymentMilestone: async (id) => {
    await handleAsync(() => paymentMilestonesService.delete(id), 'تم حذف الدفعة من الجدول');
  },

  // Marking the day is one tap per worker, so a toast and a notification for each would bury the screen.
  markAttendance: async (record) => {
    try {
      await workerAttendanceService.add(record);
    } catch (error) {
      toast.error(formatFirebaseError(error));
      throw error;
    }
  },
  addSupplier: async (supplier) => {
    await handleAsync(() => suppliersService.add(supplier), 'تمت إضافة المورّد');
  },
  updateSupplier: async (id, data) => {
    await handleAsync(() => suppliersService.update(id, data), 'تم تحديث المورّد');
  },
  deleteSupplier: async (id) => {
    await handleAsync(() => suppliersService.delete(id), 'تم حذف المورّد');
  },

  clearAttendance: async (id) => {
    try {
      await workerAttendanceService.delete(id);
    } catch (error) {
      toast.error(formatFirebaseError(error));
      throw error;
    }
  },

  addSiteReport: async (report) => {
    await handleAsync(() => siteReportsService.add(report), 'تم تسجيل تقرير الموقع');
  },
  updateSiteReport: async (id, data) => {
    await handleAsync(() => siteReportsService.update(id, data), 'تم تحديث تقرير الموقع');
  },
  deleteSiteReport: async (id) => {
    await handleAsync(() => siteReportsService.delete(id), 'تم حذف تقرير الموقع');
  },
}));

/**
 * Reads only the named parts of the data store. A screen that takes the whole store re-renders whenever ANY
 * collection changes (a new letter redraws the home page); this one re-renders only when one of the parts it
 * asked for changes. Actions are stable, so asking for them costs nothing.
 */
export function useDataSlice<K extends keyof DataState>(...keys: K[]): Pick<DataState, K> {
  return useDataStore(
    useShallow((state) => {
      const slice = {} as Pick<DataState, K>;
      for (const key of keys) slice[key] = state[key];
      return slice;
    }),
  );
}
