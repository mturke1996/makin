import React, { createContext, useContext } from 'react';
import type { BrandPdfAssets } from './fetch-brand-assets';

const PdfBrandContext = createContext<BrandPdfAssets>({
  logoDataUri: null,
  markDataUri: null,
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
  return (
    <PdfBrandContext.Provider
      value={{
        logoDataUri: uri ?? null,
        markDataUri: markUri ?? null,
      }}
    >
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
