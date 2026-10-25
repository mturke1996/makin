import { describe, expect, it } from 'vitest';
import { PROFIT_PERCENT_RANGE_MESSAGE, PROFIT_PERCENT_UNREADABLE_MESSAGE, readProfitPercentage } from './profitRule';

const value = (raw: string | null | undefined) => {
  const r = readProfitPercentage(raw);
  if (!r.ok) throw new Error(r.message ?? 'not ok');
  return r.value;
};

describe('readProfitPercentage', () => {
  it('reads plain numbers', () => {
    expect(value('10')).toBe(10);
    expect(value('12.5')).toBe(12.5);
    expect(value(' 7 ')).toBe(7);
    expect(value('0')).toBe(0);
    expect(value('99.99')).toBe(99.99);
    expect(value('99.994')).toBe(99.99);
  });

  it('reads the way people write it in Arabic', () => {
    expect(value('١٠')).toBe(10);
    expect(value('١٢٫٥')).toBe(12.5);
    expect(value('12,5')).toBe(12.5);
    expect(value('۱۵')).toBe(15);
  });

  it('accepts the percent sign the field itself shows', () => {
    expect(value('10%')).toBe(10);
    expect(value('% 10')).toBe(10);
    expect(value('١٠٪')).toBe(10);
  });

  it('treats an empty field as no percentage', () => {
    expect(value('')).toBe(0);
    expect(value('   ')).toBe(0);
    expect(value(null)).toBe(0);
    expect(value(undefined)).toBe(0);
    expect(value('%')).toBe(0);
  });

  it('keeps two decimals', () => {
    expect(value('12.345')).toBe(12.35);
    expect(value('33.333333')).toBe(33.33);
  });

  it('refuses a percentage outside 0 up to 100, and says so', () => {
    for (const raw of ['100', '150', '-5', '-0.01', '99.999', '10 20']) {
      expect(readProfitPercentage(raw), raw).toMatchObject({ ok: false, message: PROFIT_PERCENT_RANGE_MESSAGE });
    }
  });

  it('refuses text that is not a number, and says so', () => {
    for (const raw of ['abc', '1.2.3', '--5', 'عشرة']) {
      expect(readProfitPercentage(raw), raw).toMatchObject({ ok: false, message: PROFIT_PERCENT_UNREADABLE_MESSAGE });
    }
  });
});
