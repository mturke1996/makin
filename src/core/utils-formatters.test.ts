import { describe, expect, it } from 'vitest';
import { formatAmountDisplay, formatCurrencyDisplay } from './utils-formatters';

describe('formatAmountDisplay', () => {
  it('shows a whole amount with no decimals and thousands separators', () => {
    expect(formatAmountDisplay(0)).toBe('0');
    expect(formatAmountDisplay(85000)).toBe('85,000');
    expect(formatAmountDisplay(1234567)).toBe('1,234,567');
  });

  it('shows any fractional amount with exactly three decimals, so no line jumps from .5 to .25', () => {
    expect(formatAmountDisplay(8908.5)).toBe('8,908.500');
    expect(formatAmountDisplay(12.25)).toBe('12.250');
    expect(formatAmountDisplay(0.1 + 0.2)).toBe('0.300');
    expect(formatAmountDisplay(1000.125)).toBe('1,000.125');
  });

  it('settles float noise to the thousandth', () => {
    expect(formatAmountDisplay(112.39999999999999)).toBe('112.400');
    expect(formatAmountDisplay(99.9996)).toBe('100');
  });

  it('keeps the sign and survives bad input', () => {
    expect(formatAmountDisplay(-2298.5)).toBe('-2,298.500');
    expect(formatAmountDisplay(NaN)).toBe('0');
  });
});

describe('formatCurrencyDisplay', () => {
  it('puts the figure first, then a non-breaking space and the currency', () => {
    expect(formatCurrencyDisplay(12.5)).toBe('12.500 د.ل');
    expect(formatCurrencyDisplay(-3000)).toBe('-3,000 د.ل');
  });
});
