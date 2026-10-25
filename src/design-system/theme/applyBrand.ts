import type { BrandConfig } from '../../config/brand.types';

/**
 * ============================================================================
 *  applyBrandToDocument — writes brand tokens to :root as CSS variables
 * ============================================================================
 *  Tailwind utilities and hand-written CSS consume these
 *  variables, so any brand change propagates instantly with no re-render.
 *
 *  Also syncs:
 *   - <html dir>  for RTL/LTR
 *   - <html lang> for accessibility / font selection
 *   - document.title
 *   - <meta theme-color>
 * ============================================================================
 */

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r} ${g} ${b}`;
}

/**
 * Brands saved before the font refresh still carry the old Cairo/Outfit/Inter
 * stacks. Treat those exact legacy defaults as "unset" so users get the new
 * self-hosted family; any custom stack is respected.
 */
const LEGACY_STACKS = new Set([
  "'Cairo', 'Tajawal', system-ui, sans-serif",
  "'Inter', 'Outfit', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  "'Outfit', ui-monospace, monospace",
]);
function migrateStack(stack?: string): string | undefined {
  if (!stack || LEGACY_STACKS.has(stack)) return undefined;
  return stack;
}

export function applyBrandToDocument(brand: BrandConfig) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // ── Document direction + language ─────────────────────────
  root.setAttribute('dir', brand.direction);
  root.setAttribute('lang', brand.locale.split('-')[0]);

  // ── Window title ──────────────────────────────────────────
  const title = brand.features?.showTagline && brand.tagline
    ? `${brand.name} · ${brand.tagline}`
    : brand.name;
  document.title = title;

  // ── Palette → CSS variables ───────────────────────────────
  const p = brand.palette;
  const set = (name: string, value: string) => root.style.setProperty(name, value);

  // Brand *bases* only. Hover/soft/ink and the dark-mode lift are derived in
  // index.css (color-mix / oklch), so every palette works in both themes.
  set('--brand-primary-base', p.primary);
  set('--brand-primary-rgb', hexToRgb(p.primary));
  set('--brand-secondary-base', p.secondary);
  set('--brand-success-base', p.success);
  set('--brand-warning-base', p.warning);
  set('--brand-danger-base', p.danger);
  set('--brand-info-base', p.info);

  // Typography stacks (legacy defaults migrate to the current family)
  const sans = migrateStack(brand.typography.sansStack);
  const arabic = migrateStack(brand.typography.arabicStack);
  const numeric = migrateStack(brand.typography.numericStack);
  if (sans) set('--brand-font-sans', sans);
  if (numeric) set('--brand-font-mono', numeric);
  if (arabic) set('--brand-font-arabic', arabic);

  // ── PWA theme color meta ──────────────────────────────────
  const metas = document.querySelectorAll('meta[name="theme-color"]');
  if (metas.length === 0) {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', p.primary);
    document.head.appendChild(meta);
  } else {
    // Only update the unqualified one (without media query)
    metas.forEach((m) => {
      if (!m.getAttribute('media')) m.setAttribute('content', p.primary);
    });
  }
}
