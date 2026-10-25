import { getPdfBrand } from './pdfBrand';

/** The letterhead lines under the logo, printed once on the first page of every document. */
export function getPdfCompanyInfo() {
  const B = getPdfBrand();
  return {
    nameEn: 'MAKIN CONSTRUCTION COMPANY',
    servicesEn: 'Construction • Design • Engineering Supervision',
    phones: [B.contact.phone, B.contact.phone2].filter(Boolean),
  } as const;
}
