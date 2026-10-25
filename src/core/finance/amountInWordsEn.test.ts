import { describe, expect, it } from 'vitest';
import { amountInWordsEn } from './amountInWordsEn';

const words = (n: number) => amountInWordsEn(n, { closing: false });

describe('amountInWordsEn', () => {
  it('counts dinars with the singular for one', () => {
    expect(words(1)).toBe('One Libyan dinar');
    expect(words(2)).toBe('Two Libyan dinars');
    expect(words(19)).toBe('Nineteen Libyan dinars');
    expect(words(21)).toBe('Twenty-one Libyan dinars');
    expect(words(90)).toBe('Ninety Libyan dinars');
  });

  it('puts «and» after the hundreds and before a last small group', () => {
    expect(words(100)).toBe('One hundred Libyan dinars');
    expect(words(125)).toBe('One hundred and twenty-five Libyan dinars');
    expect(words(1000)).toBe('One thousand Libyan dinars');
    expect(words(1005)).toBe('One thousand and five Libyan dinars');
    expect(words(30500)).toBe('Thirty thousand five hundred Libyan dinars');
    expect(words(1250)).toBe('One thousand two hundred and fifty Libyan dinars');
    expect(words(2_000_000)).toBe('Two million Libyan dinars');
    expect(words(1_000_300_000)).toBe('One billion three hundred thousand Libyan dinars');
  });

  it('reads the thousandths as dirhams', () => {
    expect(words(10.5)).toBe('Ten Libyan dinars and five hundred dirhams');
    expect(words(0.25)).toBe('Two hundred and fifty dirhams');
    expect(words(0.001)).toBe('One dirham');
    expect(words(3.001)).toBe('Three Libyan dinars and one dirham');
  });

  it('closes with «only», and reads zero and bad input as zero', () => {
    expect(amountInWordsEn(60000)).toBe('Sixty thousand Libyan dinars only');
    expect(words(0)).toBe('Zero Libyan dinars');
    expect(words(Number.NaN)).toBe('Zero Libyan dinars');
    expect(words(-5)).toBe('Five Libyan dinars');
  });
});
