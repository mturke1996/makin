// User & Authentication Types
export type UserRole = 'admin' | 'employee';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  /** @deprecated legacy values map to employee via normalizeRole */
  role?: UserRole | 'editor' | 'manager' | 'accountant' | 'viewer';
  /**
   * What an employee may do (see src/core/access). Absent on old accounts, which then get the default
   * employee set. Ignored for admins, who may do everything.
   */
  permissions?: string[];
}

// Client Types
/** أساس احتساب النسبة المتفق عليها للعميل. */
export type ClientProfitBase = 'expenses' | 'payments';

export interface Client {
  id: string;
  name: string;
  // email removed per request, kept optional for compatibility if needed or removed from UI
  email?: string; 
  phone: string;
  address: string;
  type: 'company' | 'individual';
  profitPercentage?: number; // النسبة المتفق عليها (%)
  profitBase?: ClientProfitBase; // أساس احتساب النسبة: من المصروفات (افتراضي) أو من المدفوعات
  /** حالة المشروع: نشط (الافتراضي عند الغياب)، متوقف، أو منتهٍ. */
  status?: ClientStatus;
  /** قيمة العقد المتفق عليها مع العميل (اختيارية). */
  contractValue?: number;
  /** تاريخ بدء المشروع (YYYY-MM-DD). */
  startDate?: string;
  /** تاريخ التسليم المتوقع (YYYY-MM-DD). */
  expectedEndDate?: string;
  /** ملاحظات داخلية عن العميل أو المشروع. */
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string; // اسم المستخدم الذي أضاف العميل
}

export type ClientStatus = 'active' | 'paused' | 'completed';

/** بند في اتفاق العامل: الإجمالي = الكمية × سعر الوحدة. */
export interface WorkerAgreementItem {
  id: string;
  title: string; // وصف البند (مثلاً: تمديد نقاط الإنارة)
  quantity: number;
  unit?: string; // وحدة القياس (نقطة، م²، …)
  unitPrice: number;
  note?: string;
}

/** Saved agreement snapshot. A legacy baseline has a recording date, not an invented original date. */
export interface WorkerAgreementRevision {
  id: string;
  kind: 'created' | 'baseline' | 'revised';
  recordedAt: string;
  recordedBy: string;
  recordedByName: string;
  totalAmount: number;
  agreementItems: WorkerAgreementItem[];
  reason: string;
}

export interface Worker {
  id: string;
  clientId: string;
  name: string; // اسم العامل (مثلاً: كهرباء)
  jobType?: string; // نوع العمل
  /** القيمة المتفق عليها. عند وجود بنود تساوي مجموع إجماليات البنود بالضبط. */
  totalAmount: number;
  paidAmount: number; // المبلغ المدفوع للعامل حتى الآن
  remainingAmount: number; // المبلغ المتبقي للعامل
  status: 'active' | 'completed';
  phone?: string;
  startDate?: string; // YYYY-MM-DD
  notes?: string;
  /** تفصيل الاتفاق. بدونه يُعامَل الاتفاق كمبلغ مقطوع واحد. */
  agreementItems?: WorkerAgreementItem[];
  agreementHistory?: WorkerAgreementRevision[];
  /** Archived workers retain their agreements, payments and outstanding obligations. */
  archivedAt?: string;
  archivedBy?: string;
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
  tempClientName?: string; // أسم العميل المؤقت (إذا لم يكن مسجل)
  tempClientPhone?: string; // هاتف العميل المؤقت
  tempClientAddress?: string; // عنوان العميل المؤقت
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
  issueDate: string;
  dueDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string; // اسم المستخدم الذي أنشأ الفاتورة
}

// Payment Types
export interface Payment {
  id: string;
  invoiceId: string;
  clientId: string;
  amount: number;
  paymentMethod: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'mobile_payment';
  paymentDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string; // اسم المستخدم الذي سجل الدفعة
  /** رقم إيصال الاستلام التسلسلي (RC-2026-0007): يُخصَّص عند أول إصدار ولا يتغير بعدها. */
  receiptNumber?: string;
  receiptIssuedAt?: string;
  receiptIssuedBy?: string;
}

// Expense Types
import { ACTIVE_EXPENSE_CATEGORY_IDS } from '../core/expenseCategories';
export const EXPENSE_CATEGORIES = [...ACTIVE_EXPENSE_CATEGORY_IDS, 'marketing', 'government_fees', 'office_supplies'] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export interface Expense {
  id: string;
  clientId: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  invoiceNumber?: string; // رقم الفاتورة (اختياري) - ميزة جديدة
  isClosed: boolean; // هل تم إغلاق المصروف في فاتورة مجمعة؟
  closedAt?: string; // تاريخ الإغلاق
  expenseInvoiceId?: string; // رقم فاتورة المصروفات المجمعة
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string; // اسم المستخدم الذي سجل المصروف
  userId?: string; // Firebase Auth UID للمستخدم الذي سجل المصروف (للربط بالعهدة)
  workerId?: string; // ربط المصروف بعامل إذا كان دفعة له
  workerName?: string;
  /** رابط صورة/PDF للفاتورة أو الإيصال */
  attachmentUrl?: string;
  attachmentName?: string;
  /** كمية × سعر الوحدة (اختياري) */
  quantity?: number;
  unitPrice?: number;
  /** وحدة القياس أو الوزن (اختياري — م²، كغ، قطعة...) */
  unit?: string;
  /** ربط المصروف بمرحلة مشروع (للميزانية مقابل الفعلي) */
  phaseId?: string;
  /** دور المستخدم الذي سجل المصروف (مدير أو موظف) */
  createdByRole?: 'admin' | 'employee';
  /** هل المصروف مخفي عن الموظفين العاديين؟ */
  isHiddenFromEmployees?: boolean;
  /** هل تمت مراجعة/اعتماد المصروف من قبل المدير؟ */
  isVerifiedByAdmin?: boolean;
  /**
   * حالة الاعتماد. ما سجّله صاحب صلاحية التعديل الشامل يُعتمد فوراً، وما سجّله غيره ينتظر اعتماده.
   * غائبة عن السجلات القديمة، وهي تُعامل كمعتمدة. المصروف المرفوض يبقى محتسباً في الحساب حتى يُصحَّح أو يُحذف.
   */
  approvalStatus?: ExpenseApprovalStatus;
  /** من اعتمد أو رفض (uid) واسمه ووقت ذلك. */
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  /** سبب الرفض، إلزامي عند الرفض. */
  rejectionReason?: string;
}

export type ExpenseApprovalStatus = 'pending' | 'approved' | 'rejected';

// ═══════════════════════════════════════════════
// Project Phases & BOQ (مراحل المشروع + جدول الكميات)
// ═══════════════════════════════════════════════

export const PROJECT_PHASE_STATUSES = ['planned', 'in_progress', 'completed', 'on_hold'] as const;
export type ProjectPhaseStatus = typeof PROJECT_PHASE_STATUSES[number];

export interface ProjectPhase {
  id: string;
  clientId: string;
  name: string;
  order: number;
  status: ProjectPhaseStatus;
  budgetAmount?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export const BOQ_UNITS = ['m2', 'm3', 'm', 'kg', 'ton', 'piece', 'lot', 'day'] as const;
export type BoqUnit = typeof BOQ_UNITS[number];

export interface BoqLineItem {
  id: string;
  clientId: string;
  phaseId?: string;
  itemCode?: string;
  description: string;
  unit: BoqUnit | string;
  quantity: number;
  unitPrice: number;
  total: number;
  category?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// Standalone Debt Types (الديون)
export interface StandaloneDebt {
  id: string;
  clientId?: string; // دين على عميل (اختياري)
  partyId?: string; // أو دين على طرف خارجي
  partyType: 'client' | 'external';
  partyName: string; // اسم الطرف للمرونة
  description: string;
  amount: number; // قيمة الدين الكلية
  paidAmount: number; // المبلغ المدفوع حتى الأن
  remainingAmount: number; // المبلغ المتبقي
  status: 'unpaid' | 'partially_paid' | 'paid' | 'overdue';
  date: string; // تاريخ الدين
  dueDate?: string; // تاريخ الاستحقاق
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string; // اسم المستخدم الذي سجل الدين
}

export interface DebtParty {
  id: string;
  name: string;
  phone: string;
  address?: string;
  type: 'individual' | 'company';
  createdAt: string;
  updatedAt: string;
  clientId?: string; // ربط مبدئي مع عميل إذا وجد
}

// Expense Invoice Types (فواتير المصروفات المجمعة)
export interface ExpenseInvoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  expenseIds: string[]; // قائمة معرفات المصروفات المشمولة
  startDate: string;
  endDate: string;
  totalAmount: number;
  expenses: Expense[]; // (denormalized data for easier display)
  status: 'draft' | 'saved' | 'sent';
  issueDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string; // اسم المستخدم الذي أنشأ القائمة
}

// Dashboard Summary Types
export interface FinancialSummary {
  totalInvoiced: number; // إجمالي الفواتير
  totalCollected: number; // إجمالي المحصل
  totalExpenses: number; // إجمالي المصروفات
  netIncome: number; // صافي الدخل
  outstandingDebts: number; // ديون مستحقة لنا
  monthlyData: MonthlyData[];
}

export interface MonthlyData {
  month: number;
  year: number;
  invoiced: number;
  collected: number;
  expenses: number;
}

// User Balance Types (العهد و الأرصدة)
export interface UserBalance {
  id: string;
  clientId: string;
  userId?: string;
  userName: string;
  amount: number;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// ═══════════════════════════════════════════════
// Global Fund Types (الصندوق المشترك)
// ═══════════════════════════════════════════════

/** نوع المعاملة في الصندوق */
export type FundTransactionType = 'deposit' | 'withdrawal';

/** سجل معاملة واحدة في الصندوق */
export interface GlobalFundTransaction {
  id: string;
  type: FundTransactionType;   // إيداع أو سحب
  amount: number;
  userId: string;              // Firebase Auth UID للمستخدم المُعيَّن
  userName: string;            // اسم المستخدم
  clientId?: string;           // إذا تم الصرف على عميل
  clientName?: string;         // اسم العميل للمرجعية
  description: string;         // وصف المعاملة
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;          // من قام بإنشاء السجل
}

// Letter Types
export type LetterType = 'official' | 'offer' | 'entitlement';

export interface Letter {
  id: string;
  type: LetterType;
  refNumber: string;
  date: string;
  recipientName: string;
  recipientTitle?: string;
  recipientAddress?: string;
  recipientPhone?: string;
  clientId?: string;
  subject: string;
  greeting: string;
  bodyParagraphs: string[];
  notes?: string;
  closing: string;
  signerName: string;
  signerTitle: string;
  showStamp: boolean;
  createdAt: string;
}

// ═══════════════════════════════════════════════
// Audit Log (سجل التدقيق)
// ═══════════════════════════════════════════════

export type AuditAction = 'create' | 'update' | 'delete' | 'export' | 'pay' | 'other';

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  clientId?: string;
  summary: string;
  details?: string;
  userId: string;
  userName: string;
  createdAt: string;
}

// ═══════════════════════════════════════════════
// Site Reports (تقارير الموقع)
// ═══════════════════════════════════════════════

export interface SiteReport {
  id: string;
  clientId: string;
  title: string;
  reportDate: string;
  weather?: string;
  workersOnSite?: number;
  progressPercent?: number;
  workCompleted: string;
  issues?: string;
  nextSteps?: string;
  notes?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}
