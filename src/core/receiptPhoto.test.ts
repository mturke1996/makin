import { describe, expect, it } from 'vitest';
import { RECEIPT_MAX_INPUT_BYTES, checkReceiptFile, fitWithin } from './receiptPhoto';

describe('fitWithin', () => {
  it('scales the longer side down to the limit and keeps the proportions', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 });
  });

  it('never enlarges a small picture', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1600, 1600)).toEqual({ width: 1600, height: 1600 });
  });

  it('keeps a thin strip at least one pixel high', () => {
    expect(fitWithin(16000, 3).height).toBe(1);
  });

  it('gives nothing for an empty image', () => {
    expect(fitWithin(0, 100)).toEqual({ width: 0, height: 0 });
    expect(fitWithin(NaN, 100)).toEqual({ width: 0, height: 0 });
  });
});

describe('checkReceiptFile', () => {
  it('accepts pictures', () => {
    expect(checkReceiptFile({ type: 'image/jpeg', size: 3_000_000 })).toEqual({ ok: true });
    expect(checkReceiptFile({ type: 'image/heic', size: 1000 })).toEqual({ ok: true });
  });

  it('refuses other files and oversize ones', () => {
    expect(checkReceiptFile({ type: 'application/pdf', size: 1000 }).ok).toBe(false);
    expect(checkReceiptFile({ type: 'image/png', size: RECEIPT_MAX_INPUT_BYTES + 1 }).ok).toBe(false);
  });
});
