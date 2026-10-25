import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText, shareText, whatsappShareUrl } from './shareText';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('whatsappShareUrl', () => {
  it('encodes Arabic text, line breaks and symbols', () => {
    const url = whatsappShareUrl('كشف حساب\nالرصيد: 1,000 & 5%');
    expect(url.startsWith('https://wa.me/?text=')).toBe(true);
    expect(decodeURIComponent(url.slice('https://wa.me/?text='.length))).toBe('كشف حساب\nالرصيد: 1,000 & 5%');
    expect(url).not.toContain('\n');
    expect(url).not.toContain(' ');
  });
});

describe('shareText', () => {
  it('uses the system share sheet when the browser has one', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const open = vi.fn();
    vi.stubGlobal('navigator', { share });
    vi.stubGlobal('window', { open });
    await expect(shareText('نص', 'عنوان')).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith({ title: 'عنوان', text: 'نص' });
    expect(open).not.toHaveBeenCalled();
  });

  it('reports a dismissed share sheet as cancelled and does not open WhatsApp', async () => {
    const abort = Object.assign(new Error('x'), { name: 'AbortError' });
    const open = vi.fn();
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(abort) });
    vi.stubGlobal('window', { open });
    await expect(shareText('نص', 'عنوان')).resolves.toBe('cancelled');
    expect(open).not.toHaveBeenCalled();
  });

  it('falls back to WhatsApp when sharing fails or is unavailable', async () => {
    const open = vi.fn();
    vi.stubGlobal('window', { open });
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(new Error('boom')) });
    await expect(shareText('نص', 'عنوان')).resolves.toBe('whatsapp');
    vi.stubGlobal('navigator', {});
    await expect(shareText('نص', 'عنوان')).resolves.toBe('whatsapp');
    expect(open).toHaveBeenCalledTimes(2);
    expect(open.mock.calls[0][0]).toBe(whatsappShareUrl('نص'));
  });

  it('falls back to WhatsApp when the browser says it cannot share this', async () => {
    const share = vi.fn();
    const open = vi.fn();
    vi.stubGlobal('navigator', { share, canShare: () => false });
    vi.stubGlobal('window', { open });
    await expect(shareText('نص', 'عنوان')).resolves.toBe('whatsapp');
    expect(share).not.toHaveBeenCalled();
  });

  it('fails quietly with no window to open', async () => {
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('window', undefined);
    await expect(shareText('نص', 'عنوان')).resolves.toBe('failed');
  });
});

describe('copyText', () => {
  it('writes to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await expect(copyText('نص')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('نص');
  });

  it('reports failure when the clipboard is refused and there is no page to fall back on', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    vi.stubGlobal('document', undefined);
    await expect(copyText('نص')).resolves.toBe(false);
  });
});
