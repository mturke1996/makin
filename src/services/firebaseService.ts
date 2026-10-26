import {
  collection,
  doc,
  getDocs,
  getDoc,
  getDocFromCache,
  getDocFromServer,
  deleteDoc,
  setDoc,
  updateDoc,
  runTransaction,
  deleteField,
  query,
  where,
  onSnapshot,
  DocumentData,
  QueryConstraint,
  FirestoreError,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Client, Invoice, Payment, StandaloneDebt, Expense, ExpenseInvoice, DebtParty, Worker, UserBalance, GlobalFundTransaction, Letter, ProjectPhase, BoqLineItem, AuditLogEntry, SiteReport, PaymentMilestone } from '../types';
import { addExpenseConfirmedOnce } from './expenseTransactions';
import { SLOW_NETWORK_MESSAGE, ackOrQueue, boundOnline } from './writeAck';

/** How long a record lookup may take before the write goes ahead on the strength of what this device already holds. */
const LOOKUP_WAIT_MS = 4000;

export { toConstraints } from '../core/access/constraints';
export { createExpenseInvoiceAtomic, deleteExpenseInvoiceAtomic } from './expenseInvoiceTransactions';

/**
 * Pass as a field value to `update()` to REMOVE that field. `undefined` is stripped (field left as is),
 * so it cannot be used to clear anything. Only valid on updates, never on `add()`.
 */
export const clearField = <T = never>(): T => deleteField() as unknown as T;

/** Firestore rejects `undefined`; strip top-level undefined fields before setDoc. */
function stripUndefinedFields<T extends Record<string, unknown>>(obj: T): T {
  const out = {} as Record<string, unknown>;
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

// Generic CRUD operations
export class FirestoreService<T extends { id: string }> {
  constructor(private collectionName: string) {}

  // Get all documents (real-time listener)
  subscribe(callback: (data: T[]) => void, qConstraints: QueryConstraint[] = [], onError?: (error: FirestoreError) => void) {
    const q = query(collection(db, this.collectionName), ...qConstraints);
    return onSnapshot(
      q,
      (snapshot) => {
        const raw = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,        // Always use the Firestore doc ID as the canonical id
          _docId: d.id,     // Keep a reference to the Firestore doc ID for update/delete
        })) as unknown as T[];
        // Deduplicate by id to handle legacy mismatched IDs
        const deduped = [...new Map(raw.map(item => [item.id, item])).values()];
        callback(deduped);
      },
      onError,
    );
  }

  // Get all documents (one-time fetch)
  async getAll(qConstraints: QueryConstraint[] = []): Promise<T[]> {
    const q = query(collection(db, this.collectionName), ...qConstraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      ...d.data(),
      id: d.id,
      _docId: d.id,
    })) as unknown as T[];
  }

  // Get single document
  async getById(id: string): Promise<T | null> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { ...docSnap.data(), id: docSnap.id } as T;
    }
    return null;
  }

  /** Only a server response can settle an expense whose earlier write timed out. */
  async getConfirmedById(id: string): Promise<T | null> {
    const snapshot = await getDocFromServer(doc(db, this.collectionName, id));
    return snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } as T : null;
  }

  // Add document — uses setDoc with the provided id so Firestore doc ID matches app ID.
  // The change is on this device at once; the screen waits for the server only briefly (see writeAck).
  async add(data: any): Promise<string> {
    const id = data.id || crypto.randomUUID();
    const docRef = doc(db, this.collectionName, id);
    const payload = stripUndefinedFields({ ...data, id }) as DocumentData;
    await ackOrQueue(setDoc(docRef, payload));
    return id;
  }

  /**
   * The reference of the record with this app id. The record is almost always one this device already holds (it is
   * on the screen), so it is looked up in the local cache first: no waiting for the network. Only a record missing
   * from the cache is asked of the server, and a slow answer does not hold the write up. A legacy record whose
   * document id differs from the app's id is found by its `id` field.
   */
  private async resolveRef(id: string) {
    const ref = doc(db, this.collectionName, id);
    try {
      if ((await getDocFromCache(ref)).exists()) return ref;
    } catch {
      /* not in the cache */
    }
    let exists = true; // unknown counts as «there»: a missing record is then refused by the server and reported
    try {
      exists = (await boundOnline(getDoc(ref), LOOKUP_WAIT_MS, 'slow')).exists();
    } catch {
      return ref;
    }
    if (exists) return ref;
    const found = await boundOnline(getDocs(query(collection(db, this.collectionName), where('id', '==', id))), LOOKUP_WAIT_MS * 2, SLOW_NETWORK_MESSAGE);
    if (found.empty) throw new Error('السجل لم يعد موجوداً. حدّث الصفحة ثم حاول مجدداً.');
    return doc(db, this.collectionName, found.docs[0].id);
  }

  // Update document: found without waiting for the network, written to this device at once.
  async update(id: string, data: Partial<T>): Promise<void> {
    const merged = stripUndefinedFields(data as Record<string, unknown>) as DocumentData;
    await ackOrQueue(updateDoc(await this.resolveRef(id), merged));
  }

  // Delete document: the same way. Deleting what is already gone is not an error the person can use.
  async delete(id: string): Promise<void> {
    await ackOrQueue(deleteDoc(await this.resolveRef(id)));
  }

  /** Used by agreement editors: a stale form must never overwrite a colleague's history. */
  async updateIfUnchanged(id: string, data: Partial<T>, expectedUpdatedAt: string): Promise<void> {
    const ref = doc(db, this.collectionName, id);
    await boundOnline(runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) throw new Error('السجل لم يعد موجوداً.');
      if ((snapshot.data().updatedAt ?? '') !== expectedUpdatedAt) {
        throw new Error('تغيّر السجل أثناء تعديله. أغلق النموذج وافتحه مجدداً للاطلاع على آخر تحديث.');
      }
      transaction.update(ref, stripUndefinedFields(data as Record<string, unknown>));
    }), 15000, SLOW_NETWORK_MESSAGE);
  }
}

// Export instances for each collection
export const clientsService = new FirestoreService<Client>('clients');
export const invoicesService = new FirestoreService<Invoice>('invoices');
export const paymentsService = new FirestoreService<Payment>('payments');
class ExpensesFirestoreService extends FirestoreService<Expense> {
  constructor() { super('expenses'); }
  addConfirmedOnce(expense: Expense): Promise<string> { return addExpenseConfirmedOnce(db, expense); }
}
export const expensesService = new ExpensesFirestoreService();
export const standaloneDebtsService = new FirestoreService<StandaloneDebt>('standalone_debts');
export const debtPartiesService = new FirestoreService<DebtParty>('debt_parties');
export const expenseInvoicesService = new FirestoreService<ExpenseInvoice>('expense_invoices');
export const workersService = new FirestoreService<Worker>('workers');
export const userBalancesService = new FirestoreService<UserBalance>('user_balances');
export const globalFundTransactionsService = new FirestoreService<GlobalFundTransaction>('global_fund_transactions');
export const lettersService = new FirestoreService<Letter>('letters');
export const projectPhasesService = new FirestoreService<ProjectPhase>('project_phases');
export const boqItemsService = new FirestoreService<BoqLineItem>('boq_items');
export const paymentMilestonesService = new FirestoreService<PaymentMilestone>('payment_milestones');
export const auditLogsService = new FirestoreService<AuditLogEntry>('audit_logs');
export const siteReportsService = new FirestoreService<SiteReport>('site_reports');
