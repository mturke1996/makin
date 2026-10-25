import type { BrandConfig } from './brand.types';

/**
 * ============================================================================
 *  DEFAULT BRAND — MAKIN (construction), Linda Shop palette: deep ink + gold
 * ============================================================================
 *  Deep ink primary, warm off-white canvas, restrained gold accent.
 *  Firebase: supplied through VITE_FIREBASE_* env vars (see .env.example).
 * ============================================================================
 */

export const DEFAULT_BRAND: BrandConfig = {
  name: 'MAKIN',
  fullName: 'MAKIN للمقاولات والإنشاءات',
  tagline: 'مقاولات • إنشاءات • إدارة مشاريع',
  locale: 'ar-LY',
  direction: 'rtl',
  defaultMode: 'light',

  logo: {
    src: '/brand/logo.svg',
    srcDark: '/brand/logo.svg',
    alt: 'شعار MAKIN',
    letter: 'M',
  },

  // ═════ Deep ink + gold (Linda Shop palette) ═════
  palette: {
    primary: '#1F2633',   // deep ink — buttons, nav, focus
    secondary: '#C9972B', // gold (secondary actions / warm accent)
    success: '#0D9488',   // teal-600
    warning: '#D97706',   // amber-600
    danger: '#B91C1C',    // red-700 (matches “action” copy on peach)
    info: '#0369A1',      // sky-800
  },

  typography: {
    // One self-hosted family (Cairo, variable) for Arabic + Latin + numerals. Its digits are tabular, so columns of
    // amounts line up.
    sansStack: "'Cairo Variable', system-ui, -apple-system, 'Segoe UI', Tahoma, sans-serif",
    numericStack: "'Cairo Variable', system-ui, sans-serif",
    /** Editable in الإعدادات → العلامة التجارية */
    arabicStack: "'Cairo Variable', system-ui, -apple-system, 'Segoe UI', Tahoma, sans-serif",
  },

  contact: {
    phone: '',
    email: '',
    website: '',
    address: '',
    social: {},
  },

  /**
   * Firebase — intentionally empty. The real project's credentials come from
   * `VITE_FIREBASE_*` env vars (see `.env.example`) and always win over this default.
   */
  firebase: {
    apiKey: 'REPLACE_ME',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    measurementId: '',
  },

  features: {
    showTagline: true,
    showSocial: false,
    enableDarkMode: true,
  },
};

export default DEFAULT_BRAND;
