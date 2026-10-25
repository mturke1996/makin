import { getPdfBrand } from './pdfBrand';

/** نصوص PDF — تُشتق من إعدادات العلامة التجارية الحالية. */
export function getPdfCompanyInfo() {
  const B = getPdfBrand();
  return {
    taglineEn: B.tagline || 'Integrated Business Management',
    services: [
      'إدارة العملاء والمشاريع',
      'الفواتير والمدفوعات',
      'المصروفات والتقارير',
      'تصدير PDF احترافي',
    ],
    footerNote: 'وثيقة رسمية — يُعتد بالنسخ المطبوعة الموثّقة فقط.',
  } as const;
}
