import type { AuditAction } from '../../types';

/** استنتاج نوع العملية من رسالة النجاح العربية */
export function inferAuditAction(message: string): AuditAction {
  if (/حذف/.test(message)) return 'delete';
  if (/تحديث|تعديل|سداد/.test(message)) return 'update';
  if (/إضافة|إنشاء|تسجيل/.test(message)) return 'create';
  if (/تصدير|Excel|PDF/.test(message)) return 'export';
  return 'other';
}

export function inferAuditEntity(message: string): string {
  if (/عميل/.test(message)) return 'client';
  if (/فاتورة/.test(message)) return 'invoice';
  if (/دفعة|مدفوع/.test(message)) return 'payment';
  if (/مصروف/.test(message)) return 'expense';
  if (/دين/.test(message)) return 'debt';
  if (/عامل/.test(message)) return 'worker';
  if (/عهدة|رصيد/.test(message)) return 'balance';
  if (/مرحلة/.test(message)) return 'phase';
  if (/بند|BOQ|كميات/.test(message)) return 'boq';
  if (/تقرير\s*ال?موقع/.test(message)) return 'site_report';
  if (/خطاب|رسالة/.test(message)) return 'letter';
  if (/مستخدم/.test(message)) return 'user';
  return 'record';
}
