import { describe, expect, it } from 'vitest';
import { percentLabel, shareOfTotal, usedPercentLabel } from './pdfPercent';

describe('shareOfTotal', () => {
  it('always adds up to 100 (the report that read 33 + 28 + 25 + 5 + 4 + 6 = 101)', () => {
    const shares = shareOfTotal([24200, 20240, 18500, 3600, 2800, 4050]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(100);
    expect(shares).toEqual([33, 28, 25, 5, 4, 5]);
  });

  it('splits thirds without losing a point', () => {
    expect(shareOfTotal([1, 1, 1])).toEqual([34, 33, 33]);
  });

  it('is of what is shown: a single row is the whole', () => {
    expect(shareOfTotal([500])).toEqual([100]);
  });

  it('gives zero for nothing, negatives and bad numbers', () => {
    expect(shareOfTotal([])).toEqual([]);
    expect(shareOfTotal([0, 0])).toEqual([0, 0]);
    expect(shareOfTotal([100, -50, NaN])).toEqual([100, 0, 0]);
  });
});

describe('percentLabel', () => {
  it('never prints 0% for an amount that exists', () => {
    expect(percentLabel(0, 0.2)).toBe('<1%');
    expect(percentLabel(0, 0)).toBe('0%');
    expect(percentLabel(34, 33.6)).toBe('34%');
  });
});

describe('usedPercentLabel', () => {
  it('is not 100% while money is left, nor once the budget is exceeded', () => {
    expect(usedPercentLabel(99.6, 100)).toBe('99%');
    expect(usedPercentLabel(100.3, 100)).toBe('101%');
    expect(usedPercentLabel(100, 100)).toBe('100%');
  });

  it('rounds the rest plainly', () => {
    expect(usedPercentLabel(27950, 33000)).toBe('85%');
    expect(usedPercentLabel(20240, 18000)).toBe('112%');
  });

  it('has nothing to say without a budget', () => {
    expect(usedPercentLabel(500, 0)).toBe('—');
  });
});
