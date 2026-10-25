import { deleteField, doc, runTransaction, type Firestore } from 'firebase/firestore';
import type { Expense, ExpenseInvoice } from '../types';
import { sumMoney } from '../core/finance/money';

// Leaves headroom below Firestore's transaction write limit and fails before touching any document.
export const MAX_INVOICE_EXPENSES = 400;

export interface CreateExpenseInvoiceInput {
  id: string;
  clientId: string;
  expenseIds: string[];
  invoiceNumber: string;
  notes?: string;
  createdBy: string;
  now?: string;
}

function selectedIds(ids: string[]): string[] {
  const unique = [...new Set(ids)];
  if (!unique.length) throw new Error('لا توجد مصروفات محددة');
  if (unique.length !== ids.length) throw new Error('تحتوي القائمة على مصروف مكرر. حدّث الاختيار.');
  if (unique.length > MAX_INVOICE_EXPENSES) throw new Error(`الحد الأقصى للفاتورة ${MAX_INVOICE_EXPENSES} مصروف. قسّم الاختيار إلى فواتير أصغر.`);
  if (unique.some((id) => !id || id.includes('/'))) throw new Error('معرف مصروف غير صالح');
  return unique;
}

/** The server records one invoice and freezes its exact source records in one commit. */
export async function createExpenseInvoiceAtomic(db: Firestore, input: CreateExpenseInvoiceInput): Promise<ExpenseInvoice> {
  const ids = selectedIds(input.expenseIds);
  if (!input.clientId || !input.invoiceNumber.trim()) throw new Error('اختر العميل وأدخل رقم الفاتورة');
  const invoiceRef = doc(db, 'expense_invoices', input.id);
  const now = input.now ?? new Date().toISOString();

  return runTransaction(db, async (transaction) => {
    // Every read is before every write. Retrying a conflict rereads fresh amounts and lock states.
    const existingInvoice = await transaction.get(invoiceRef);
    if (existingInvoice.exists()) throw new Error('رقم العملية مستخدم مسبقاً. حدّث قائمة الفواتير.');
    const snapshots = await Promise.all(ids.map((id) => transaction.get(doc(db, 'expenses', id))));
    const expenses = snapshots.map((snapshot): Expense => {
      if (!snapshot.exists()) throw new Error('أحد المصروفات المحددة حُذف. حدّث القائمة ثم حاول مجدداً.');
      const expense = { ...snapshot.data(), id: snapshot.id } as Expense;
      if (expense.clientId !== input.clientId) throw new Error('يجب أن تنتمي جميع المصروفات إلى العميل المحدد');
      if (expense.isClosed || expense.expenseInvoiceId) throw new Error('أحد المصروفات أُدرج بالفعل في فاتورة. حدّث القائمة.');
      if (!Number.isFinite(expense.amount) || expense.amount < 0.001 || expense.amount > 1_000_000_000) {
        throw new Error('أحد المصروفات يحتوي على مبلغ غير صالح. صحّحه قبل إصدار الفاتورة.');
      }
      if (!expense.date) throw new Error('أحد المصروفات لا يحتوي على تاريخ. صحّحه أولاً.');
      return expense;
    });
    const dates = expenses.map((expense) => expense.date).sort();
    const invoice: ExpenseInvoice = {
      id: input.id,
      invoiceNumber: input.invoiceNumber.trim(),
      clientId: input.clientId,
      expenseIds: ids,
      startDate: dates[0]!,
      endDate: dates[dates.length - 1]!,
      totalAmount: sumMoney(expenses.map((expense) => expense.amount)),
      expenses,
      status: 'saved',
      issueDate: now.slice(0, 10),
      ...(input.notes ? { notes: input.notes } : {}),
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
    };
    transaction.set(invoiceRef, invoice);
    snapshots.forEach((snapshot) => transaction.update(snapshot.ref, {
      isClosed: true, closedAt: now, expenseInvoiceId: input.id, updatedAt: now,
    }));
    return invoice;
  });
}

/** Delete/reopen together; never unlock a source that now belongs to another invoice. */
export async function deleteExpenseInvoiceAtomic(db: Firestore, id: string): Promise<void> {
  const invoiceRef = doc(db, 'expense_invoices', id);
  await runTransaction(db, async (transaction) => {
    const invoiceSnapshot = await transaction.get(invoiceRef);
    if (!invoiceSnapshot.exists()) throw new Error('فاتورة المصروفات لم تعد موجودة');
    const invoice = invoiceSnapshot.data() as ExpenseInvoice;
    // Older imported invoices may have no source records or duplicate ids; delete their unique
    // existing sources together, while retaining the same safe write limit.
    const uniqueIds = [...new Set(invoice.expenseIds ?? [])];
    const ids = uniqueIds.length ? selectedIds(uniqueIds) : [];
    const snapshots = await Promise.all(ids.map((expenseId) => transaction.get(doc(db, 'expenses', expenseId))));
    for (const snapshot of snapshots) {
      if (!snapshot.exists()) continue; // A client-maintenance deletion may have removed the source.
      const expense = snapshot.data();
      if (expense.expenseInvoiceId && expense.expenseInvoiceId !== id) {
        throw new Error('أحد المصروفات مرتبط بفاتورة أخرى. تعذّر حذف الفاتورة حفاظاً على حساباته.');
      }
      if (expense.clientId !== invoice.clientId) throw new Error('بيانات الفاتورة لا تطابق عميل المصروف');
    }
    const now = new Date().toISOString();
    snapshots.forEach((snapshot) => {
      if (snapshot.exists()) transaction.update(snapshot.ref, {
        isClosed: false, closedAt: deleteField(), expenseInvoiceId: deleteField(), updatedAt: now,
      });
    });
    transaction.delete(invoiceRef);
  });
}
