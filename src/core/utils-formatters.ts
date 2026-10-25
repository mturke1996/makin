import dayjs from 'dayjs';
import { parseMoneyText, roundMoney } from './finance/money';
import 'dayjs/locale/ar';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('ar');

/** رمز العملة الليبية */
export const CURRENCY_SYMBOL = 'د.ل';

/** رقم المبلغ فقط (بدون عملة) — أرقام لاتينية مع فاصلة آلاف يدوية */
export const formatCurrencyNumber = (amount: number): string => {
  const rounded = Math.round(Math.abs(amount));
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/** تنسيق رقم مع الحفاظ على الخانات العشرية (بدون تقريب) */
export function formatDecimalNumber(amount: number, maxFractionDigits = 6): string {
  if (!Number.isFinite(amount)) return '0';
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);

  if (Number.isInteger(abs)) {
    return sign + abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  const fixed = abs.toFixed(maxFractionDigits).replace(/\.?0+$/, '');
  const [intPart, fracPart] = fixed.split('.');
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return sign + (fracPart ? `${intFormatted}.${fracPart}` : intFormatted);
}

/** عملة مع الحفاظ على الكسور العشرية عند وجودها */
export function formatCurrencyDecimal(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}${formatDecimalNumber(amount)} ${CURRENCY_SYMBOL}`;
}

/** Quantity × unit price, rounded once to the app's accounting precision (0.001 LYD). */
export function multiplyQuantityPrice(quantity: number, unitPrice: number): number {
  return Number.isFinite(quantity) && Number.isFinite(unitPrice) ? roundMoney(quantity * unitPrice) : 0;
}

/** تنسيق مبلغ/سعر — يحافظ على الكسور إن وُجدت، وإلا يُنسّق كعدد صحيح */
export function formatAmountDisplay(amount: number): string {
  return Number.isInteger(amount) ? formatCurrencyNumber(amount) : formatDecimalNumber(amount);
}

/** تنسيق عملة — يحافظ على الكسور إن وُجدت (الرقم ثم العملة — مناسب للعربية) */
export function formatCurrencyDisplay(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}${formatAmountDisplay(Math.abs(amount))}\u00A0${CURRENCY_SYMBOL}`;
}

/**
 * تنسيق العملة — الرقم ثم «د.ل» كنص عادي بدون أي رموز اتجاه (bidi).
 * هذا يطابق المشروع المرجعي تماماً ويجعل العرض صحيحاً في صفحة عربية.
 */
export const formatCurrency = (amount: number): string => {
  const sign = Math.round(amount) < 0 ? '-' : '';
  return `${sign}${formatCurrencyNumber(amount)} ${CURRENCY_SYMBOL}`;
};

export const formatMoney = formatCurrency;

export const formatDate = (date: string | Date, format: string = 'DD/MM/YYYY'): string => {
  return dayjs(date).format(format);
};

export const formatDateTime = (date: string | Date): string => {
  return dayjs(date).format('DD/MM/YYYY - hh:mm A');
};

export const formatRelativeDate = (date: string | Date): string => {
  return dayjs(date).fromNow();
};

export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  }
  return phone;
};

export const getStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    draft: 'مسودة',
    sent: 'مرسلة',
    paid: 'مدفوعة',
    partially_paid: 'مدفوعة جزئياً',
    overdue: 'متأخرة',
    cancelled: 'ملغاة',
    unpaid: 'غير مدفوع',
    company: 'شركة',
    individual: 'فرد',
  };
  return statusMap[status] || status;
};

export { expenseCategories, LEGACY_EXPENSE_CATEGORY_LABELS, getExpenseCategoryLabel } from './expenseCategories';

/** وحدات القياس/الوزن للمصروفات — مقاولات وبناء */
export const EXPENSE_MEASURE_UNITS = [
  'kg', 'quintal', 'ton',
  'm', 'm2', 'm3', 'km',
  'piece', 'sack', 'bag', 'lot',
  'liter', 'hour', 'day', 'trip', 'load', 'roll',
] as const;

export const EXPENSE_MEASURE_UNIT_GROUPS: { title: string; units: readonly string[] }[] = [
  { title: 'وزن', units: ['kg', 'quintal', 'ton'] },
  { title: 'طول ومساحة', units: ['m', 'm2', 'm3', 'km'] },
  { title: 'عدد وتغليف', units: ['piece', 'sack', 'bag', 'lot'] },
  { title: 'سوائل وتشغيل', units: ['liter', 'hour', 'day', 'trip', 'load', 'roll'] },
];

export const MEASURE_UNIT_LABELS: Record<string, string> = {
  m2: 'م²',
  m3: 'م³',
  m: 'م.ط',
  km: 'كيلومتر',
  kg: 'كغ',
  quintal: 'قنطار',
  ton: 'طن',
  sack: 'شوال',
  piece: 'قطعة',
  lot: 'مقطوعية',
  bag: 'كيس',
  liter: 'لتر',
  hour: 'ساعة',
  day: 'يوم',
  trip: 'نقلة',
  load: 'حمولة',
  roll: 'لفة',
};

export function formatMeasureUnit(unit?: string): string {
  if (!unit?.trim()) return '';
  return MEASURE_UNIT_LABELS[unit] || unit;
}

export function formatQuantityWithUnit(quantity: number, unit?: string): string {
  const q = formatDecimalNumber(quantity);
  const u = formatMeasureUnit(unit);
  return u ? `${q} ${u}` : q;
}

/** هل المصروف يحتوي سطر كمية × سعر؟ */
export function expenseHasQuantityLine(e: { quantity?: number; unitPrice?: number }): boolean {
  return (e.quantity ?? 0) > 0 && e.unitPrice != null && !Number.isNaN(e.unitPrice);
}

/** «5 م² × 120 د.ل = 600 د.ل» */
export function formatExpenseQuantityLine(e: {
  quantity?: number;
  unitPrice?: number;
  unit?: string;
  amount?: number;
}): string {
  if (!expenseHasQuantityLine(e)) return '';
  const q = e.quantity!;
  const p = e.unitPrice!;
  const total = e.amount ?? multiplyQuantityPrice(q, p);
  const qtyLabel = formatQuantityWithUnit(q, e.unit);
  return `${qtyLabel} × ${formatCurrencyDisplay(p)} = ${formatCurrencyDisplay(total)}`;
}

/** ملاحظات فقط (بدون تكرار الكمية) */
export function formatExpenseNotesOnly(notes?: string): string {
  return notes?.trim() || '';
}

/** يقبل أثناء الكتابة: أرقام وفاصلة عشرية واحدة (، أو .) */
export function isPartialDecimalInput(value: string): boolean {
  return value === '' || /^-?[0-9٠-٩۰-۹]*[.,،٫]?[0-9٠-٩۰-۹]*$/.test(value);
}

/** تحويل نص مكتوب («12,5» أو «1,500» أو «١٢٫٥») إلى رقم؛ القاعدة الواحدة في core/finance/money. */
export function parseDecimalInput(raw: unknown): number | undefined {
  return parseMoneyText(raw);
}

/** خلية PDF — أسطر عربية واضحة أو شرطة */
export function formatExpensePdfQtyBlock(e: {
  quantity?: number;
  unitPrice?: number;
  unit?: string;
}): string {
  if (!expenseHasQuantityLine(e)) return '—';
  const q = e.quantity!;
  const p = e.unitPrice!;
  const qtyLine = formatQuantityWithUnit(q, e.unit);
  const unitSuffix = e.unit ? 'سعر الوحدة' : 'سعر القطعة';
  return `الكمية: ${qtyLine}\n${unitSuffix}: ${formatCurrencyDisplay(p)}`;
}
