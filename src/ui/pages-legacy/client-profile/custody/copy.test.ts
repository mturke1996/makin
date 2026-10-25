import { describe, expect, it } from 'vitest';
import { balanceTone, custodyCount, expensesCount, holdersCount, usedText } from './copy';

describe('custody copy', () => {
  it.each([
    [0, 'لا عهد بعد'],
    [1, 'عهدة واحدة'],
    [2, 'عهدتان'],
    [3, '3 عهد'],
    [10, '10 عهد'],
    [11, '11 عهدة'],
  ])('custody count %i', (n, text) => expect(custodyCount(n)).toBe(text));

  it.each([
    [0, 'لا مستخدمين'],
    [1, 'مستخدم واحد'],
    [2, 'مستخدمان'],
    [5, '5 مستخدمين'],
    [12, '12 مستخدماً'],
  ])('holders count %i', (n, text) => expect(holdersCount(n)).toBe(text));

  it.each([
    [0, 'بلا مصروفات'],
    [1, 'مصروف واحد'],
    [2, 'مصروفان'],
    [7, '7 مصروفات'],
    [30, '30 مصروفاً'],
  ])('expenses count %i', (n, text) => expect(expensesCount(n)).toBe(text));

  it('used percent reads whole numbers, and tiny use as less than 1%', () => {
    expect(usedText(0)).toBe('0%');
    expect(usedText(0.4)).toBe('أقل من 1%');
    expect(usedText(56.6)).toBe('57%');
    expect(usedText(100)).toBe('100%');
    expect(usedText(Number.NaN)).toBe('0%');
  });

  it('balance tone: negative is danger, exactly zero is neutral, positive is success', () => {
    expect(balanceTone(-0.001)).toBe('danger');
    expect(balanceTone(0)).toBe('neutral');
    expect(balanceTone(0.1 + 0.2 - 0.3)).toBe('neutral');
    expect(balanceTone(5)).toBe('success');
  });
});
