import React, { createContext, useContext, useMemo } from 'react';
import type { BrandPdfAssets } from './fetch-brand-assets';
import { LOGO_FALLBACK_RATIO, imageRatioOf } from './pdfImage';

type PdfBrandContextValue = BrandPdfAssets & {
  /** Height ÷ width of the logo file, so it is drawn in its own shape. */
  logoRatio: number;
};

const PdfBrandContext = createContext<PdfBrandContextValue>({
  logoDataUri: null,
  markDataUri: null,
  logoRatio: LOGO_FALLBACK_RATIO,
});

export function PdfLogoProvider({
  uri,
  markUri,
  children,
}: {
  uri: string | null | undefined;
  markUri?: string | null | undefined;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({ logoDataUri: uri ?? null, markDataUri: markUri ?? null, logoRatio: imageRatioOf(uri) }),
    [uri, markUri],
  );
  return (
    <PdfBrandContext.Provider value={value}>
      {children}
    </PdfBrandContext.Provider>
  );
}

export function usePdfLogoDataUri(): string | null {
  return useContext(PdfBrandContext).logoDataUri;
}

export function usePdfMarkDataUri(): string | null {
  return useContext(PdfBrandContext).markDataUri;
}

export function usePdfLogoRatio(): number {
  return useContext(PdfBrandContext).logoRatio;
}
