import { describe, expect, it } from 'vitest';
import { mapsHref, phoneHref, whatsappHref, whatsappNumber } from './contactLinks';

describe('whatsappNumber', () => {
  it('puts the country code in front of a local number and drops the leading zero', () => {
    expect(whatsappNumber('0912345678')).toBe('218912345678');
    expect(whatsappNumber('091-234 5678')).toBe('218912345678');
    expect(whatsappNumber(' 091 234 5678 ')).toBe('218912345678');
    expect(whatsappNumber('0214445566')).toBe('218214445566');
  });

  it('accepts a local number typed without the leading zero', () => {
    expect(whatsappNumber('912345678')).toBe('218912345678');
  });

  it('keeps an existing country code', () => {
    expect(whatsappNumber('+218 91 234 5678')).toBe('218912345678');
    expect(whatsappNumber('00218912345678')).toBe('218912345678');
    expect(whatsappNumber('218912345678')).toBe('218912345678');
    expect(whatsappNumber('+218-91-2345678')).toBe('218912345678');
  });

  it('drops the trunk zero typed after the country code', () => {
    expect(whatsappNumber('+2180912345678')).toBe('218912345678');
    expect(whatsappNumber('002180912345678')).toBe('218912345678');
  });

  it('leaves another country alone', () => {
    expect(whatsappNumber('+20 101 234 5678')).toBe('201012345678');
    expect(whatsappNumber('0020 101 234 5678')).toBe('201012345678');
    expect(whatsappNumber('201012345678')).toBe('201012345678');
  });

  it('reads Arabic-Indic digits', () => {
    expect(whatsappNumber('٠٩١٢٣٤٥٦٧٨')).toBe('218912345678');
  });

  it('uses another default country code when asked', () => {
    expect(whatsappNumber('0101234567', '20')).toBe('20101234567');
  });

  it('is null when there is no number to speak of', () => {
    expect(whatsappNumber('')).toBeNull();
    expect(whatsappNumber(undefined)).toBeNull();
    expect(whatsappNumber('12345')).toBeNull();
    expect(whatsappNumber('هاتف')).toBeNull();
  });
});

describe('whatsappHref', () => {
  it('builds the wa.me link', () => {
    expect(whatsappHref('0912345678')).toBe('https://wa.me/218912345678');
    expect(whatsappHref('abc')).toBeNull();
  });
});

describe('phoneHref', () => {
  it('keeps the digits and a leading plus', () => {
    expect(phoneHref('091 234-5678')).toBe('tel:0912345678');
    expect(phoneHref('+218 91 234 5678')).toBe('tel:+218912345678');
    expect(phoneHref('٠٩١٢٣٤٥٦٧٨')).toBe('tel:0912345678');
  });
  it('is null without a dialable number', () => {
    expect(phoneHref('')).toBeNull();
    expect(phoneHref('123')).toBeNull();
    expect(phoneHref(null)).toBeNull();
  });
});

describe('mapsHref', () => {
  it('searches the written address', () => {
    expect(mapsHref('طرابلس، حي الأندلس')).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('طرابلس، حي الأندلس')}`,
    );
  });
  it('collapses spaces and refuses an empty address', () => {
    expect(mapsHref('  بنغازي   الفويهات ')).toContain(encodeURIComponent('بنغازي الفويهات'));
    expect(mapsHref('   ')).toBeNull();
    expect(mapsHref(undefined)).toBeNull();
  });
});
