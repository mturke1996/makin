import { z } from 'zod';
import { dayNumber } from '../../../core/finance/clientProject';
import { parseDecimalInput } from '../../../core/utils-formatters';

/** An amount typed in a number field (string) or loaded from a record (number). Must be above zero. */
const positiveAmount = z
  .union([z.string(), z.number()])
  .refine((v) => (parseDecimalInput(v) ?? 0) > 0, 'أدخل مبلغاً أكبر من صفر');

/** Optional numeric field kept as typed (the submit handler parses it). */
const looseNumber = z.union([z.string(), z.number()]);

export const paymentSchema = z.object({
  amount: positiveAmount,
  paymentMethod: z.string().min(1),
  paymentDate: z.string().min(1, 'اختر تاريخ الدفعة'),
  notes: z.string(),
});
export type PaymentFormValues = z.infer<typeof paymentSchema>;

export const milestoneSchema = z.object({
  title: z.string().trim().min(1, 'اكتب اسم الدفعة'),
  amount: positiveAmount,
  dueDate: z.string().min(1, 'اختر موعد الاستحقاق'),
  order: looseNumber,
  notes: z.string(),
});
export type MilestoneFormValues = z.infer<typeof milestoneSchema>;

export const expenseSchema = z.object({
  description: z.string().trim().min(1, 'اكتب وصف المصروف'),
  amount: positiveAmount,
  quantity: looseNumber,
  unit: z.string(),
  unitPrice: looseNumber,
  category: z.string().min(1),
  date: z.string().min(1, 'اختر تاريخ المصروف'),
  invoiceNumber: z.string(),
  supplierId: z.string(),
  notes: z.string(),
  workerId: z.string(),
  phaseId: z.string(),
});
export type ExpenseFormValues = z.infer<typeof expenseSchema>;

export const debtSchema = z.object({
  partyName: z.string().trim().min(1, 'اكتب اسم الطرف'),
  description: z.string(),
  amount: positiveAmount,
  date: z.string().min(1, 'اختر تاريخ الدين'),
  notes: z.string(),
});
export type DebtFormValues = z.infer<typeof debtSchema>;

export const balanceSchema = z.object({
  userId: z.string().min(1, 'اختر الموظف المستلم'),
  amount: positiveAmount,
  date: z.string().min(1, 'اختر تاريخ الإيداع'),
  notes: z.string(),
});
export type BalanceFormValues = z.infer<typeof balanceSchema>;

/** Longest note kept on a client. */
export const CLIENT_NOTES_MAX = 1000;

/** Contract values above this are a typing slip (one thousand billion). */
const CONTRACT_VALUE_MAX = 1e12;

export const clientSchema = z
  .object({
    name: z.string().trim().min(2, 'اكتب اسم العميل (حرفان على الأقل)'),
    email: z
      .string()
      .trim()
      .refine((v) => !v || /^\S+@\S+\.\S+$/.test(v), 'صيغة البريد الإلكتروني غير صحيحة'),
    phone: z.string().trim().min(8, 'أدخل رقم هاتف من 8 أرقام على الأقل'),
    address: z.string().trim().min(3, 'اكتب عنوان العميل'),
    type: z.enum(['company', 'individual']),
    /** Project details. All optional: a client saved before they existed is an active one without dates. */
    status: z.enum(['active', 'paused', 'completed']),
    /** Typed amount, empty when there is no contract value. */
    contractValue: z.string().trim(),
    startDate: z.string().trim(),
    expectedEndDate: z.string().trim(),
    notes: z.string().max(CLIENT_NOTES_MAX, `الملاحظات طويلة، الحد الأقصى ${CLIENT_NOTES_MAX} حرف`),
    documentLanguage: z.enum(['ar', 'both']),
  })
  .superRefine((v, ctx) => {
    if (v.contractValue) {
      const amount = parseDecimalInput(v.contractValue);
      const path = ['contractValue'];
      if (amount == null) ctx.addIssue({ code: 'custom', path, message: 'اكتب قيمة العقد أرقاماً فقط' });
      else if (amount < 0) ctx.addIssue({ code: 'custom', path, message: 'قيمة العقد لا تكون أقل من صفر' });
      else if (amount > CONTRACT_VALUE_MAX) ctx.addIssue({ code: 'custom', path, message: 'قيمة العقد كبيرة جداً' });
      // The same rounding toMilli uses, so 100.1 is fine and 100.1234 is not.
      else if (!Number.isInteger(Number((amount * 1000).toPrecision(12)))) {
        ctx.addIssue({ code: 'custom', path, message: 'ثلاث خانات عشرية كحد أقصى' });
      }
    }
    const start = v.startDate ? dayNumber(v.startDate) : null;
    const end = v.expectedEndDate ? dayNumber(v.expectedEndDate) : null;
    if (v.startDate && start == null) ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'تاريخ البدء غير صحيح' });
    if (v.expectedEndDate && end == null) {
      ctx.addIssue({ code: 'custom', path: ['expectedEndDate'], message: 'تاريخ التسليم غير صحيح' });
    } else if (start != null && end != null && end < start) {
      ctx.addIssue({ code: 'custom', path: ['expectedEndDate'], message: 'تاريخ التسليم لا يسبق تاريخ البدء' });
    }
  });
export type ClientFormValues = z.infer<typeof clientSchema>;

/** What the (already final) phase / BOQ / site report forms hand back. Their fields are plain strings or numbers. */
export interface PhaseFormValues {
  name: string;
  order: string | number;
  status: string;
  budgetAmount: string | number;
  startDate: string;
  endDate: string;
  notes: string;
}

export interface BoqFormValues {
  itemCode: string;
  description: string;
  unit: string;
  quantity: string | number;
  unitPrice: string | number;
  phaseId: string;
  /** An expense category: ties the line's estimate to the spending on that category. Empty for none. */
  category: string;
  notes: string;
}

export interface SiteReportFormValues {
  title: string;
  reportDate: string;
  weather: string;
  workersOnSite: string | number;
  progressPercent: string | number;
  workCompleted: string;
  issues: string;
  nextSteps: string;
  notes: string;
}
