import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  DocumentData,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Client, Invoice, Payment, Debt, Project, Expense, StandaloneDebt, ExpenseInvoice } from '../types';

// Generic CRUD operations
export class FirestoreService<T extends { id: string }> {
  constructor(private collectionName: string) {}

  async getAll(constraints: QueryConstraint[] = []): Promise<T[]> {
    try {
      const collectionRef = collection(db, this.collectionName);
      const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as T[];
    } catch (error) {
      console.error(`Error getting ${this.collectionName}:`, error);
      throw error;
    }
  }

  async getById(id: string): Promise<T | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      }
      return null;
    } catch (error) {
      console.error(`Error getting ${this.collectionName} by id:`, error);
      throw error;
    }
  }

  async add(data: Omit<T, 'id'>): Promise<string> {
    try {
      const collectionRef = collection(db, this.collectionName);
      const docRef = await addDoc(collectionRef, {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return docRef.id;
    } catch (error) {
      console.error(`Error adding ${this.collectionName}:`, error);
      throw error;
    }
  }

  async update(id: string, data: Partial<Omit<T, 'id'>>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Error updating ${this.collectionName}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Subscribe to real-time updates
  subscribe(
    callback: (data: T[]) => void,
    constraints: QueryConstraint[] = []
  ): () => void {
    const collectionRef = collection(db, this.collectionName);
    const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;

    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as T[];
      callback(data);
    });
  }
}

// Specific services for each collection
export const clientsService = new FirestoreService<Client>('clients');
export const invoicesService = new FirestoreService<Invoice>('invoices');
export const paymentsService = new FirestoreService<Payment>('payments');
export const debtsService = new FirestoreService<Debt>('debts');
export const projectsService = new FirestoreService<Project>('projects');
export const expensesService = new FirestoreService<Expense>('expenses');
export const standaloneDebtsService = new FirestoreService<StandaloneDebt>('standaloneDebts');
export const expenseInvoicesService = new FirestoreService<ExpenseInvoice>('expenseInvoices');

// Special functions for expense invoices
export async function closeExpensesAndCreateInvoice(
  expenseIds: string[],
  clientId: string,
  startDate: string,
  endDate: string,
  notes?: string
): Promise<string> {
  try {
    // Get all expenses
    const expenses: Expense[] = [];
    for (const expenseId of expenseIds) {
      const expense = await expensesService.getById(expenseId);
      if (expense && !expense.isClosed) {
        expenses.push(expense);
      }
    }

    if (expenses.length === 0) {
      throw new Error('لا توجد مصروفات غير مغلقة');
    }

    // Calculate total
    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Generate invoice number
    const invoiceNumber = `EXP-${Date.now()}`;

    // Create expense invoice
    const invoiceId = await expenseInvoicesService.add({
      invoiceNumber,
      clientId,
      expenseIds,
      startDate,
      endDate,
      totalAmount,
      expenses,
      status: 'draft',
      issueDate: new Date().toISOString(),
      notes,
    });

    // Mark expenses as closed
    const closedAt = new Date().toISOString();
    for (const expense of expenses) {
      await expensesService.update(expense.id, {
        isClosed: true,
        closedAt,
        expenseInvoiceId: invoiceId,
      });
    }

    return invoiceId;
  } catch (error) {
    console.error('Error closing expenses and creating invoice:', error);
    throw error;
  }
}
