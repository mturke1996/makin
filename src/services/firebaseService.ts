import {
  collection,
  doc,
  getDocs,
  getDoc,
  getDocFromServer,
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

  // Add document — uses setDoc with the provided id so Firestore doc ID matches app ID
  async add(data: any): Promise<string> {
    const id = data.id || crypto.randomUUID();
    const docRef = doc(db, this.collectionName, id);
    const payload = stripUndefinedFields({ ...data, id }) as DocumentData;
    await setDoc(docRef, payload);
    return id;
  }

  // Update document — checks existence first, then falls back to internal ID lookup
  async update(id: string, data: Partial<T>): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    
    const merged = stripUndefinedFields(data as Record<string, unknown>) as DocumentData;
    if (docSnap.exists()) {
      // Document found by its Firestore doc ID — update it directly
      await updateDoc(docRef, merged);
    } else {
      // Fallback: the app's id might differ from the Firestore doc ID (legacy data)
      const q = query(collection(db, this.collectionName), where('id', '==', id));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const realRef = doc(db, this.collectionName, querySnap.docs[0].id);
        await updateDoc(realRef, merged);
      } else {
        throw new Error('السجل لم يعد موجوداً. حدّث الصفحة ثم حاول مجدداً.');
      }
    }
  }

  // Delete document — checks existence first, then falls back to internal ID lookup
  async delete(id: string): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      // Document found by its Firestore doc ID — delete it
      await this.deleteExisting(docSnap.id);
    } else {
      // Fallback: the app's id might differ from the Firestore doc ID (legacy data)
      const q = query(collection(db, this.collectionName), where('id', '==', id));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        await this.deleteExisting(querySnap.docs[0].id);
      } else {
        throw new Error('السجل لم يعد موجوداً. حدّث الصفحة ثم حاول مجدداً.');
      }
    }
  }

  private async deleteExisting(id: string): Promise<void> {
    const ref = doc(db, this.collectionName, id);
    await runTransaction(db, async (transaction) => {
      if (!(await transaction.get(ref)).exists()) throw new Error('السجل لم يعد موجوداً.');
      transaction.delete(ref);
    });
  }

  /** Used by agreement editors: a stale form must never overwrite a colleague's history. */
  async updateIfUnchanged(id: string, data: Partial<T>, expectedUpdatedAt: string): Promise<void> {
    const ref = doc(db, this.collectionName, id);
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) throw new Error('السجل لم يعد موجوداً.');
      if ((snapshot.data().updatedAt ?? '') !== expectedUpdatedAt) {
        throw new Error('تغيّر السجل أثناء تعديله. أغلق النموذج وافتحه مجدداً للاطلاع على آخر تحديث.');
      }
      transaction.update(ref, stripUndefinedFields(data as Record<string, unknown>));
    });
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
