import dayjs from 'dayjs';
import 'dayjs/locale/ar';

// تعيين اللغة العربية بشكل افتراضي
dayjs.locale('ar');

// تنسيق العملة - الدينار الليبي
export const formatCurrency = (amount: number): string => {
  // استخدام تنسيق مخصص للدينار الليبي
  const formatted = new Intl.NumberFormat('ar-LY', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amount);
  
  return `${formatted} د.ل`;
};

// تنسيق التاريخ بالعربية
export const formatDate = (date: string | Date, format: string = 'DD/MM/YYYY'): string => {
  return dayjs(date).format(format);
};

// تنسيق التاريخ والوقت
export const formatDateTime = (date: string | Date): string => {
  return dayjs(date).format('DD/MM/YYYY - hh:mm A');
};

// تنسيق التاريخ النسبي (منذ...)
export const formatRelativeDate = (date: string | Date): string => {
  return dayjs(date).fromNow();
};

// تنسيق الأرقام
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('ar-LY').format(num);
};

// تنسيق النسبة المئوية
export const formatPercentage = (num: number): string => {
  return `${num.toFixed(2)}%`;
};

// تنسيق رقم الهاتف الليبي
export const formatLibyanPhone = (phone: string): string => {
  // إزالة المسافات والرموز
  const cleaned = phone.replace(/\D/g, '');
  
  // تنسيق رقم الهاتف الليبي
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  }
  
  return phone;
};

// طرق الدفع بالعربية
export const paymentMethods = {
  cash: 'نقداً',
  check: 'شيك',
  bank_transfer: 'تحويل بنكي',
  credit_card: 'بطاقة ائتمان',
  mobile_payment: 'دفع إلكتروني',
} as const;

export type PaymentMethod = keyof typeof paymentMethods;

// حالات الفواتير بالعربية
export const invoiceStatuses = {
  draft: 'مسودة',
  sent: 'مرسلة',
  paid: 'مدفوعة',
  partially_paid: 'مدفوعة جزئياً',
  overdue: 'متأخرة',
  cancelled: 'ملغاة',
} as const;

// حالات الديون بالعربية
export const debtStatuses = {
  unpaid: 'غير مدفوع',
  partially_paid: 'مدفوع جزئياً',
  paid: 'مدفوع',
  overdue: 'متأخر',
} as const;

// أنواع العملاء بالعربية
export const clientTypes = {
  company: 'شركة',
  individual: 'فرد',
} as const;

// حالات المشاريع بالعربية
export const projectStatuses = {
  planning: 'تخطيط',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
  on_hold: 'متوقف مؤقتاً',
  cancelled: 'ملغي',
} as const;

