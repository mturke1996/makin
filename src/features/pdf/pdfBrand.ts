import { useBrandStore } from '../../stores/useBrandStore';

export interface PdfBrandSnapshot {
  name: string;
  fullName: string;
  tagline: string;
  logoUrl: string;
  palette: {
    primary: string;
    primaryDark: string;
    accent: string;
    text: string;
    muted: string;
    border: string;
    rowAlt: string;
    headerBg: string;
    success: string;
    warning: string;
    danger: string;
  };
  contact: {
    phone: string;
    phone2: string;
    email: string;
    address: string;
  };
}

function mix(hex: string, pct: number, toward: 'white' | 'black'): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;
  const target = toward === 'white' ? 255 : 0;
  r = Math.round(r + (target - r) * pct);
  g = Math.round(g + (target - g) * pct);
  b = Math.round(b + (target - b) * pct);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function isPdfImageSrc(src: string): boolean {
  if (!src) return false;
  if (/^data:image\/(png|jpe?g|gif)/i.test(src)) return true;
  if (/\.svg(\?|$)/i.test(src)) return false;
  if (/\.webp(\?|$)/i.test(src)) return false;
  return /\.(png|jpe?g|gif)(\?|$)/i.test(src);
}

function resolveLogo(src: string): string {
  if (!src || !isPdfImageSrc(src)) return '';
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  if (src.startsWith('data:')) return src;
  if (typeof window !== 'undefined') {
    if (src.startsWith('/')) return `${window.location.origin}${src}`;
    return new URL(src, window.location.origin).toString();
  }
  return src;
}

function resolvePdfLogo(): string {
  const b = useBrandStore.getState().brand;
  const candidates = [
    b.logo.pdfSrc,
    '/brand/logo-pdf.png',
    '/brand/logo.png',
    b.logo.src,
  ].filter(Boolean) as string[];

  for (const src of candidates) {
    const url = resolveLogo(src);
    if (url) return url;
  }
  return '';
}

export function getPdfBrand(): PdfBrandSnapshot {
  const b = useBrandStore.getState().brand;
  const primary = b.palette.primary || '#003366';
  const secondary = b.palette.secondary || '#1A5276';

  return {
    name: b.name || '',
    fullName: b.fullName || b.name || '',
    tagline: b.tagline || '',
    logoUrl: resolvePdfLogo(),
    palette: {
      primary,
      primaryDark: mix(primary, 0.22, 'black'),
      accent: secondary,
      text: '#0F2340',
      muted: '#4A6080',
      border: '#D8E0EA',
      rowAlt: '#F4F7FB',
      headerBg: primary,
      success: b.palette.success || '#0D9488',
      warning: b.palette.warning || '#B45309',
      danger: b.palette.danger || '#B91C1C',
    },
    contact: {
      phone: b.contact.phone || '',
      phone2: b.contact.phoneSecondary || '',
      email: b.contact.email || '',
      address: b.contact.address || '',
    },
  };
}

/** Phones only — no website (private platform URL). */
export function buildFooterPhones(brand: PdfBrandSnapshot): string[] {
  return [brand.contact.phone, brand.contact.phone2].filter(Boolean);
}

export function buildFooterLine(brand: PdfBrandSnapshot): string {
  const phones = buildFooterPhones(brand).join('  ·  ');
  return [brand.contact.address, phones].filter(Boolean).join('  |  ');
}

export function buildFooterAddressLine(brand: PdfBrandSnapshot): string {
  return brand.contact.address || 'طرابلس، ليبيا';
}
