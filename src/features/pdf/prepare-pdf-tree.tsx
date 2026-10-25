import type { ReactElement } from 'react';
import { fetchBrandPdfAssets } from './fetch-brand-assets';
import { PdfLogoProvider } from './pdf-logo-context';

/** Fetch brand assets then wrap PDF tree so Image components get data URIs. */
export async function preparePdfTree(element: ReactElement): Promise<ReactElement> {
  const { logoDataUri, markDataUri } = await fetchBrandPdfAssets();
  return (
    <PdfLogoProvider uri={logoDataUri} markUri={markDataUri}>
      {element}
    </PdfLogoProvider>
  );
}
