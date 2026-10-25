import DEFAULT_BRAND from '../../config/brand.config';

async function fetchAsDataUri(path: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const url = `${window.location.origin}${path}`;
    const res = await fetch(url, { credentials: 'same-origin', cache: 'force-cache' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export type BrandPdfAssets = {
  logoDataUri: string | null;
  markDataUri: string | null;
};

const PDF_LOGO_PATH = DEFAULT_BRAND.logo.pdfSrc || '/brand/logo-pdf.png';
const MARK_PATH = '/brand/icon-mark.png';

/** Load letterhead + mark PNG as data URIs for react-pdf Image. */
export async function fetchBrandPdfAssets(): Promise<BrandPdfAssets> {
  const [logoDataUri, markDataUri] = await Promise.all([
    fetchAsDataUri(PDF_LOGO_PATH),
    fetchAsDataUri(MARK_PATH),
  ]);
  return { logoDataUri, markDataUri: markDataUri || logoDataUri };
}
