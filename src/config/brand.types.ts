/**
 * ============================================================================
 *  WHITE-LABEL BRAND CONFIG — TYPE DEFINITIONS
 * ============================================================================
 *  Every surface of the product reads from a `BrandConfig` object. Swap the
 *  object and the product re-skins instantly — no code changes required.
 *
 *  Consumers:
 *   - /config/brand.config.ts  (build-time defaults)
 *   - /stores/useBrandStore.ts (runtime overrides, persisted)
 *   - /config/BrandProvider.tsx (React context)
 *   - /design-system/theme    (MUI + Tailwind CSS variables)
 * ============================================================================
 */

export type ThemeMode = 'light' | 'dark';
export type Direction = 'ltr' | 'rtl';

/** Minimal Firebase config shape (matches firebase/app) */
export interface FirebaseBrandConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

/**
 * A brand color palette. We only require the semantic roles we actually
 * consume; shades are derived automatically by the theme bridge.
 */
export interface BrandPalette {
  /** Primary brand hex (buttons, links, focus rings). */
  primary: string;
  /** Secondary accent hex. */
  secondary: string;
  /** Success hex (positive states). */
  success: string;
  /** Warning hex (caution states). */
  warning: string;
  /** Error/destructive hex. */
  danger: string;
  /** Info hex (neutral notices). */
  info: string;
}

export interface BrandLogo {
  /** Primary logo (used on light surfaces). Absolute URL or /public path. */
  src: string;
  /** PNG/JPG letterhead for PDF (react-pdf does not support SVG). */
  pdfSrc?: string;
  /** Optional inverted logo for dark surfaces. Falls back to `src`. */
  srcDark?: string;
  /** Alt text. */
  alt: string;
  /** Fallback mono-letter if image fails to load (e.g. "A" for Acme). */
  letter: string;
}

export interface BrandContact {
  phone?: string;
  phoneSecondary?: string;
  email?: string;
  website?: string;
  address?: string;
  social?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
}

export interface BrandTypography {
  /** Primary UI font stack. */
  sansStack: string;
  /** Optional numeric/monospace-ish font for currency/dates. */
  numericStack?: string;
  /** Optional Arabic font stack (used when `direction === 'rtl'`). */
  arabicStack?: string;
}

export interface BrandConfig {
  /** Short name, e.g. "Acme". Shown in nav, window title, PWA short name. */
  name: string;
  /** Long display name, e.g. "Acme SaaS, Inc." Shown in footer & headers. */
  fullName: string;
  /** One-line product description / tagline. */
  tagline: string;
  /** Locale & direction. */
  locale: string;             // 'en-US', 'ar-LY', ...
  direction: Direction;
  /** Default theme mode for new users. */
  defaultMode: ThemeMode;
  /** Logo assets. */
  logo: BrandLogo;
  /** Semantic color palette (hex). */
  palette: BrandPalette;
  /** Optional typography override. */
  typography: BrandTypography;
  /** Contact / social links. */
  contact: BrandContact;
  /** Firebase config for this tenant. */
  firebase: FirebaseBrandConfig;
  /** Optional feature flags. */
  features?: {
    showTagline?: boolean;
    showSocial?: boolean;
    enableDarkMode?: boolean;
  };
}

/** Partial override shape used by the runtime store. */
export type BrandOverride = Partial<Omit<BrandConfig, 'palette' | 'logo' | 'contact' | 'typography' | 'firebase' | 'features'>> & {
  palette?: Partial<BrandPalette>;
  logo?: Partial<BrandLogo>;
  contact?: Partial<BrandContact>;
  typography?: Partial<BrandTypography>;
  firebase?: Partial<FirebaseBrandConfig>;
  features?: Partial<NonNullable<BrandConfig['features']>>;
};
