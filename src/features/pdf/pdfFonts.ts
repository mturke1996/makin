// @ts-nocheck
import { Font } from '@react-pdf/renderer';

/** Tajawal — proven Arabic PDF font (turki-dairy-erp). */
export const PDF_FONT_FAMILY = 'MakinPdf';

let registered = false;
let loadPromise: Promise<void> | null = null;

export function registerPdfFonts(): void {
  if (registered || typeof window === 'undefined') return;
  try {
    const origin = window.location.origin;
    Font.register({
      family: PDF_FONT_FAMILY,
      fonts: [
        { src: `${origin}/fonts/Tajawal-Regular.ttf`, fontWeight: 400, fontStyle: 'normal' },
        { src: `${origin}/fonts/Tajawal-Bold.ttf`, fontWeight: 700, fontStyle: 'normal' },
      ],
    });
    Font.registerHyphenationCallback((word) => [word]);
    registered = true;
  } catch {
    /* duplicate registration */
  }
}

export async function ensurePdfFontsLoaded(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!loadPromise) {
    loadPromise = (async () => {
      registerPdfFonts();
      await Promise.all([
        Font.load({ fontFamily: PDF_FONT_FAMILY, fontWeight: 400, fontStyle: 'normal' }),
        Font.load({ fontFamily: PDF_FONT_FAMILY, fontWeight: 700, fontStyle: 'normal' }),
      ]);
    })().catch((err) => {
      loadPromise = null;
      throw err;
    });
  }
  return loadPromise;
}

export function ensurePdfFonts(): void {
  registerPdfFonts();
}

if (typeof window !== 'undefined') {
  registerPdfFonts();
}
