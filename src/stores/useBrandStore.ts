import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import DEFAULT_BRAND from '../config/brand.config';
import type { BrandConfig, BrandOverride } from '../config/brand.types';

/**
 * ============================================================================
 *  BRAND STORE — runtime white-label overrides
 * ============================================================================
 *  Backed by localStorage so the configured brand survives reloads.
 *  `brand` is always a fully-materialized `BrandConfig` (defaults deep-merged
 *  with any override). This lets consumers read a single source of truth
 *  without nil-checks.
 * ============================================================================
 */

function deepMerge<T>(base: T, override: Partial<T>): T {
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
  if (!override) return out;
  for (const key of Object.keys(override) as (keyof T)[]) {
    const o = (override as any)[key];
    const b = (base as any)[key];
    if (o && typeof o === 'object' && !Array.isArray(o) && b && typeof b === 'object') {
      out[key] = deepMerge(b, o);
    } else if (o !== undefined) {
      out[key] = o;
    }
  }
  return out;
}

interface BrandState {
  /** Currently-applied brand. */
  brand: BrandConfig;
  /** Persisted override slice. */
  override: BrandOverride;
  /** Apply a partial override. Persists automatically. */
  updateBrand: (patch: BrandOverride) => void;
  /** Replace the whole brand at once. */
  setBrand: (next: BrandConfig) => void;
  /** Reset to the compiled-in default. */
  resetBrand: () => void;
  /** Clear ONLY the firebase override (keeps other branding intact). */
  resetFirebaseOverride: () => void;
}

export const useBrandStore = create<BrandState>()(
  persist(
    (set, _get) => ({
      brand: DEFAULT_BRAND,
      override: {},

      updateBrand: (patch) =>
        set((s) => {
          const nextOverride = deepMerge(s.override, patch) as BrandOverride;
          const nextBrand = deepMerge(DEFAULT_BRAND, nextOverride as any) as BrandConfig;
          return { brand: nextBrand, override: nextOverride };
        }),

      setBrand: (next) => set({ brand: next, override: next as any }),

      resetBrand: () => set({ brand: DEFAULT_BRAND, override: {} }),

      resetFirebaseOverride: () =>
        set((s) => {
          const { firebase: _drop, ...rest } = s.override as any;
          const nextBrand = deepMerge(DEFAULT_BRAND, rest) as BrandConfig;
          return { brand: nextBrand, override: rest as BrandOverride };
        }),
    }),
    {
      name: 'brand-override',
      partialize: (s) => ({ override: s.override }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const { firebase: _drop, ...rest } = (state.override || {}) as BrandOverride & { firebase?: unknown };
          state.override = rest;
          state.brand = deepMerge(DEFAULT_BRAND, state.override as any) as BrandConfig;
        }
      },
    }
  )
);
