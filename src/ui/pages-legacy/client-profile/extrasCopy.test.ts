import { describe, expect, it } from 'vitest';
import { extrasCountPhrase } from './extrasCopy';

describe('extrasCountPhrase', () => {
  it('invoices', () => {
    expect([0, 1, 2, 3, 10, 11, 25].map((n) => extrasCountPhrase('invoices', n))).toEqual([
      'لا فواتير بعد',
      'فاتورة واحدة',
      'فاتورتان',
      '3 فواتير',
      '10 فواتير',
      '11 فاتورة',
      '25 فاتورة',
    ]);
  });
  it('letters', () => {
    expect([0, 1, 2, 4, 12].map((n) => extrasCountPhrase('letters', n))).toEqual([
      'لا رسائل بعد',
      'رسالة واحدة',
      'رسالتان',
      '4 رسائل',
      '12 رسالة',
    ]);
  });
});
