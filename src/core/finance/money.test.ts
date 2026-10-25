import { describe, expect, it } from 'vitest';
import { addMoney, parseMoneyText, roundMoney, subtractMoney, sumMoney, toMilli } from './money';

describe('money', () => {
  it('sums without float drift', () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
    expect(sumMoney([100.1, 12.3])).toBe(112.4);
  });

  it('adds and subtracts to the thousandth', () => {
    expect(addMoney(0.1, 0.7)).toBe(0.8);
    expect(subtractMoney(0.8, 0.7)).toBe(0.1);
  });

  it('rounds half up at the third decimal', () => {
    expect(toMilli(1.0005)).toBe(1001);
    expect(roundMoney(33.3333)).toBe(33.333);
  });

  it('treats non-finite input as zero', () => {
    expect(toMilli(NaN)).toBe(0);
    expect(sumMoney([Infinity, 5])).toBe(5);
  });
});

describe('parseMoneyText', () => {
  it('reads plain and decimal numbers', () => {
    expect(parseMoneyText('12')).toBe(12);
    expect(parseMoneyText('12.5')).toBe(12.5);
    expect(parseMoneyText(' 0.001 ')).toBe(0.001);
    expect(parseMoneyText(7)).toBe(7);
  });

  it('treats a clean thousands comma as grouping, as the app prints amounts', () => {
    expect(parseMoneyText('1,500')).toBe(1500);
    expect(parseMoneyText('12,345,678')).toBe(12345678);
    expect(parseMoneyText('1,234.56')).toBe(1234.56);
  });

  it('treats any other lone comma as the decimal mark', () => {
    expect(parseMoneyText('12,5')).toBe(12.5);
    expect(parseMoneyText('0,25')).toBe(0.25);
    expect(parseMoneyText('1.234,56')).toBe(1234.56);
  });

  it('accepts Arabic-Indic digits and the Arabic decimal mark', () => {
    expect(parseMoneyText('١٢٫٥')).toBe(12.5);
    expect(parseMoneyText('۱٬۵۰۰')).toBe(1500);
  });

  it('rejects empty and unreadable text instead of guessing', () => {
    expect(parseMoneyText('')).toBeUndefined();
    expect(parseMoneyText('-')).toBeUndefined();
    expect(parseMoneyText('12abc')).toBeUndefined();
    expect(parseMoneyText('1.2.3')).toBeUndefined();
    expect(parseMoneyText(null)).toBeUndefined();
    expect(parseMoneyText(NaN)).toBeUndefined();
  });

  it('keeps the sign', () => {
    expect(parseMoneyText('-12,5')).toBe(-12.5);
  });
});
