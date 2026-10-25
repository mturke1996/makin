import { describe, expect, it } from 'vitest';
import { remainingPhrase } from './useVisibleCount';

const noun = { one: 'حركة', two: 'حركتان', few: 'حركات', many: 'حركة' };

describe('remainingPhrase', () => {
  it('speaks the Arabic count forms', () => {
    expect(remainingPhrase(1, noun)).toBe('حركة متبقية');
    expect(remainingPhrase(2, noun)).toBe('حركتان متبقيتان');
    expect(remainingPhrase(7, noun)).toBe('7 حركات متبقية');
    expect(remainingPhrase(10, noun)).toBe('10 حركات متبقية');
    expect(remainingPhrase(11, noun)).toBe('11 حركة متبقية');
    expect(remainingPhrase(552, noun)).toBe('552 حركة متبقية');
  });
});
