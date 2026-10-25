import React, { createContext, createElement, useContext } from 'react';

/**
 * Bilingual documents for clients who read English: every label that has an English wording is printed as
 * «العربية · English». Values (names, notes, amounts) are never translated. The layout stays right-to-left,
 * so the Arabic reads first and the English follows it on the same line.
 */

export const EN: Record<string, string> = {
  // titles
  'إيصال استلام': 'Payment Receipt',
  'فاتورة': 'Invoice',
  'كشف المصروفات': 'Expenses Statement',
  'كشف المدفوعات': 'Payments Statement',
  'كشف العمال والمقاولين': 'Workers & Contractors Statement',
  'كشف الديون': 'Debts Statement',
  'التقرير الشامل': 'Comprehensive Report',
  // document meta and particulars
  'رقم الإيصال': 'Receipt No.',
  'تاريخ الاستلام': 'Date received',
  'رقم الفاتورة': 'Invoice No.',
  'تاريخ الإصدار': 'Issue date',
  'تاريخ الاستحقاق': 'Due date',
  'المرجع': 'Ref.',
  'استلمنا من السيد / السادة': 'From',
  'إلى السيد / السادة': 'To',
  'المشروع / العميل': 'Project / Client',
  'الهاتف': 'Phone',
  'العنوان': 'Address',
  'الفترة': 'Period',
  'طريقة الدفع': 'Payment method',
  'عن': 'For',
  'الحالة': 'Status',
  'ملاحظات': 'Notes',
  // amounts
  'المبلغ المستلم': 'Amount received',
  'المبلغ كتابةً': 'Amount in words',
  'المبلغ': 'Amount',
  'هذه الدفعة': 'This payment',
  'المسدد قبل هذه الدفعة': 'Paid before this payment',
  'المتبقي على الفاتورة': 'Balance due on the invoice',
  'الفاتورة مسددة بالكامل': 'Invoice fully paid',
  'المجموع الفرعي': 'Subtotal',
  'الضريبة': 'Tax',
  'الإجمالي المستحق': 'Total due',
  'الإجمالي': 'Total',
  // table columns
  'الوصف': 'Description',
  'الكمية': 'Qty',
  'سعر الوحدة': 'Unit price',
  'البند': 'Item',
  'البيان': 'Details',
  'التاريخ': 'Date',
  'القيمة': 'Value',
  'الدفعة': 'Instalment',
  'الاستحقاق': 'Due',
  'المدفوع': 'Paid',
  'المسدد': 'Settled',
  'المتبقي': 'Remaining',
  'العامل': 'Worker',
  'العمل': 'Work',
  'الاتفاق': 'Agreed',
  'الدين': 'Debt',
  'الميزانية': 'Budget',
  'الفعلي': 'Actual',
  // summary cells
  'إجمالي المصروفات': 'Total expenses',
  'إجمالي المدفوعات': 'Total payments',
  'إجمالي الديون': 'Total debts',
  'إجمالي الاتفاقيات': 'Total agreements',
  'عدد السجلات': 'Records',
  'عدد الدفعات': 'Payments',
  'عدد الديون': 'Debts',
  'متوسط الدفعة': 'Average payment',
  'متوسط السجل': 'Average record',
  'آخر دفعة': 'Last payment',
  'أكبر تصنيف': 'Largest category',
  'المحصّل': 'Collected',
  'المصروفات': 'Expenses',
  'المدفوع للعمال': 'Paid to workers',
  'المستحق للعمال': 'Owed to workers',
  'الديون المتبقية': 'Outstanding debts',
  'المدفوعات المحصّلة من العميل': 'Payments collected from the client',
  'ملخص الحساب': 'Account summary',
  'توزيع المصروفات حسب التصنيف': 'Expenses by category',
  'توزيع المدفوعات حسب الطريقة': 'Payments by method',
  'تفاصيل المصروفات': 'Expense details',
  'تفاصيل المدفوعات': 'Payment details',
  // payment methods
  'نقداً': 'Cash',
  'شيك': 'Cheque',
  'تحويل بنكي': 'Bank transfer',
  'بطاقة': 'Card',
  'دفع إلكتروني': 'Electronic payment',
  'دفعة على الحساب': 'Payment on account',
  // statuses
  'مدفوعة': 'Paid',
  'مدفوعة جزئياً': 'Partially paid',
  'متأخرة': 'Overdue',
  'ملغاة': 'Cancelled',
  'مسودة': 'Draft',
  'مرسلة': 'Sent',
  // signatures
  'المستلم': 'Received by',
  'اعتماد الإدارة': 'Management approval',
  'معتمد إلكترونياً': 'Electronically approved',
};

const PdfLang = createContext(false);

/** Wrap a document element so its labels print in both languages. */
export const PdfLangProvider = ({ bilingual, children }: { bilingual: boolean; children?: React.ReactNode }) => (
  <PdfLang.Provider value={bilingual}>{children}</PdfLang.Provider>
);

/** The element in both languages when the client asks for it, otherwise unchanged. */
export function withDocumentLanguage(element: React.ReactElement, client?: { documentLanguage?: string } | null): React.ReactElement {
  return client?.documentLanguage === 'both' ? createElement(PdfLangProvider, { bilingual: true, children: element }) : element;
}

export const useBilingual = () => useContext(PdfLang);

export const bilingualLabel = (text: string, on: boolean): string => (on && EN[text] ? `${text}  ·  ${EN[text]}` : text);

/** `label(text)` in the language of the document being drawn. */
export function useLabel(): (text: string) => string {
  const on = useContext(PdfLang);
  return (text) => bilingualLabel(text, on);
}
