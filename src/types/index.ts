// User & Authentication Types
export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

// Client Types
export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  type: 'company' | 'individual';
  profitPercentage?: number; // نسبة الأرباح من المصروفات
  createdAt: string;
  updatedAt: string;
}

// Invoice Types
export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  projectId?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'partially_paid';
  issueDate: string;
  dueDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Payment Types
export interface Payment {
  id: string;
  invoiceId: string;
  clientId: string;
  amount: number;
  paymentMethod: 'cash' | 'check' | 'bank_transfer' | 'credit_card';
  paymentDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Debt Party Types (بروفايلات الديون: أشخاص/محلات/شركات)
export interface DebtParty {
  id: string;
  clientId: string;
  name: string; // اسم الشخص/المحل/الشركة
  phone: string; // رقم الهاتف
  address: string; // العنوان
  type: 'person' | 'shop' | 'company'; // نوع البروفايل
  createdAt: string;
  updatedAt: string;
}

// Standalone Debt Types (منفصل عن المصروفات)
export interface StandaloneDebt {
  id: string;
  clientId: string;
  partyId: string; // معرف البروفايل المرتبط
  partyType: 'person' | 'shop' | 'company'; // نوع الطرف: شخص، محل، شركة
  partyName: string; // اسم الشخص/المحل/الشركة (للتوافق مع البيانات القديمة)
  description: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'active' | 'paid';
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Debt Types (للفواتير)
export interface Debt {
  id: string;
  clientId: string;
  invoiceId: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'unpaid' | 'partially_paid' | 'paid' | 'overdue';
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

// Expense Types (مصروفات)
export interface Expense {
  id: string;
  clientId: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
  isClosed: boolean; // هل تم إغلاق المصروف في فاتورة
  closedAt?: string; // تاريخ الإغلاق
  expenseInvoiceId?: string; // معرف فاتورة المصروفات المرتبطة
  createdAt: string;
  updatedAt: string;
}

// Expense Invoice Types (فاتورة مصروفات)
export interface ExpenseInvoice {
  id: string;
  invoiceNumber: string; // رقم الفاتورة
  clientId: string;
  expenseIds: string[]; // قائمة معرفات المصروفات المغلقة
  startDate: string; // تاريخ بداية الفترة
  endDate: string; // تاريخ نهاية الفترة
  totalAmount: number; // إجمالي المبلغ
  expenses: Expense[]; // تفاصيل المصروفات
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  issueDate: string; // تاريخ إصدار الفاتورة
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Project Types
export interface Project {
  id: string;
  name: string;
  description?: string;
  clientId: string;
  startDate: string;
  endDate?: string;
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
  totalBudget: number;
  createdAt: string;
  updatedAt: string;
}

// Financial Summary Types
export interface MonthlyData {
  month: number;
  year: number;
  totalInvoiced: number;
  totalCollected: number;
  totalDebt: number;
}

export interface FinancialSummary {
  totalDebt: number;
  totalPaid: number;
  totalRemaining: number;
  overdueAmount: number;
  collectionRate: number;
  monthlyData: MonthlyData[];
}

// Client Summary
export interface ClientSummary {
  totalInvoiced: number;
  totalPaid: number;
  totalExpenses: number;
  totalDebts: number;
  remainingDebt: number;
  invoiceCount: number;
  paymentCount: number;
  expenseCount: number;
  debtCount: number;
}
