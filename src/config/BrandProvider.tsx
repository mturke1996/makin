import { createContext, useContext, useEffect, useMemo, ReactNode } from 'react';
import { useBrandStore } from '../stores/useBrandStore';
import type { BrandConfig } from './brand.types';
import { applyBrandToDocument } from '../design-system/theme/applyBrand';

const BrandContext = createContext<BrandConfig | null>(null);

/**
 * Mounts the active brand into:
 *   - a React context (so components can read via `useBrand`)
 *   - document.documentElement (CSS variables, lang, dir, title)
 *
 *  Any update to `useBrandStore` re-applies automatically.
 */
export function BrandProvider({ children }: { children: ReactNode }) {
  const brand = useBrandStore((s) => s.brand);

  useEffect(() => {
    applyBrandToDocument(brand);
  }, [brand]);

  const value = useMemo(() => brand, [brand]);
  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

/** Read the fully-resolved active brand. */
export function useBrand(): BrandConfig {
  const ctx = useContext(BrandContext);
  if (!ctx) {
    // Fallback: direct store read. Keeps tests/storybook usable outside provider.
    return useBrandStore.getState().brand;
  }
  return ctx;
}
