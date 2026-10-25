import { describe, expect, it } from 'vitest';
import { amountInWords } from './amountInWords';

const words = (n: number) => amountInWords(n, { closing: false });

describe('amountInWords: dinars', () => {
  it('counts one and two with their own forms', () => {
    expect(words(1)).toBe('دينار ليبي واحد');
    expect(words(2)).toBe('ديناران ليبيان');
  });

  it('uses the plural from three to ten and the accusative from eleven', () => {
    expect(words(3)).toBe('ثلاثة دنانير ليبية');
    expect(words(10)).toBe('عشرة دنانير ليبية');
    expect(words(11)).toBe('أحد عشر ديناراً ليبياً');
    expect(words(12)).toBe('اثنا عشر ديناراً ليبياً');
    expect(words(25)).toBe('خمسة وعشرون ديناراً ليبياً');
    expect(words(99)).toBe('تسعة وتسعون ديناراً ليبياً');
  });

  it('gives a whole hundred the bare noun, with «مئتا» for 200', () => {
    expect(words(100)).toBe('مائة دينار ليبي');
    expect(words(200)).toBe('مئتا دينار ليبي');
    expect(words(300)).toBe('ثلاثمائة دينار ليبي');
    expect(words(500)).toBe('خمسمائة دينار ليبي');
    expect(words(125)).toBe('مائة وخمسة وعشرون ديناراً ليبياً');
    expect(words(103)).toBe('مائة وثلاثة دنانير ليبية');
  });

  it('puts the scale word in construct before the currency, and in the accusative when more follows', () => {
    expect(words(1000)).toBe('ألف دينار ليبي');
    expect(words(2000)).toBe('ألفا دينار ليبي');
    expect(words(3000)).toBe('ثلاثة آلاف دينار ليبي');
    expect(words(12000)).toBe('اثنا عشر ألف دينار ليبي');
    expect(words(30000)).toBe('ثلاثون ألف دينار ليبي');
    expect(words(200000)).toBe('مئتا ألف دينار ليبي');
    expect(words(12500)).toBe('اثنا عشر ألفاً وخمسمائة دينار ليبي');
    expect(words(30500)).toBe('ثلاثون ألفاً وخمسمائة دينار ليبي');
    expect(words(2500)).toBe('ألفان وخمسمائة دينار ليبي');
  });

  it('keeps the last part\'s form after a scale', () => {
    expect(words(1001)).toBe('ألف ودينار ليبي واحد');
    expect(words(1002)).toBe('ألف وديناران ليبيان');
    expect(words(3005)).toBe('ثلاثة آلاف وخمسة دنانير ليبية');
    expect(words(3011)).toBe('ثلاثة آلاف وأحد عشر ديناراً ليبياً');
    expect(words(85000)).toBe('خمسة وثمانون ألف دينار ليبي');
  });

  it('reads millions and billions', () => {
    expect(words(1000000)).toBe('مليون دينار ليبي');
    expect(words(2000000)).toBe('مليونا دينار ليبي');
    expect(words(5000000)).toBe('خمسة ملايين دينار ليبي');
    expect(words(1250000)).toBe('مليون ومئتان وخمسون ألف دينار ليبي');
    expect(words(1000000000)).toBe('مليار دينار ليبي');
  });
});

describe('amountInWords: dirhams and the closing', () => {
  it('adds the thousandths as dirhams', () => {
    expect(words(0.5)).toBe('خمسمائة درهم');
    expect(words(12500.25)).toBe('اثنا عشر ألفاً وخمسمائة دينار ليبي ومئتان وخمسون درهماً');
    expect(words(1.001)).toBe('دينار ليبي واحد ودرهم واحد');
    expect(words(3.002)).toBe('ثلاثة دنانير ليبية ودرهمان');
    expect(words(100.2)).toBe('مائة دينار ليبي ومئتا درهم');
  });

  it('rounds to the thousandth, ignores the sign, and reads zero', () => {
    expect(words(10.0004)).toBe('عشرة دنانير ليبية');
    expect(words(-250)).toBe(words(250));
    expect(words(0)).toBe('صفر دينار ليبي');
  });

  it('ends with «فقط لا غير» unless told not to', () => {
    expect(amountInWords(25000)).toBe('خمسة وعشرون ألف دينار ليبي فقط لا غير');
  });
});
