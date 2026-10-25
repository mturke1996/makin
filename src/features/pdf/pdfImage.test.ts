import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LOGO_FALLBACK_RATIO, imageRatioOf } from './pdfImage';

const logoUri = `data:image/png;base64,${readFileSync(resolve('public/brand/logo-pdf.png')).toString('base64')}`;

describe('imageRatioOf', () => {
  it('reads the shape of the letterhead logo from its own header', () => {
    expect(imageRatioOf(logoUri)).toBeCloseTo(LOGO_FALLBACK_RATIO, 3);
  });

  it('reads any PNG, not just the logo', () => {
    // 2 x 1 pixels
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAD0lEQVR4nGP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==';
    expect(imageRatioOf(`data:image/png;base64,${png}`)).toBe(0.5);
  });

  it('falls back for anything it cannot read', () => {
    expect(imageRatioOf(null)).toBe(LOGO_FALLBACK_RATIO);
    expect(imageRatioOf('https://example.com/logo.png')).toBe(LOGO_FALLBACK_RATIO);
    expect(imageRatioOf('data:image/png;base64,AAAA')).toBe(LOGO_FALLBACK_RATIO);
    expect(imageRatioOf(`data:image/png;base64,${'A'.repeat(60)}`, 0.4)).toBe(0.4);
  });
});
