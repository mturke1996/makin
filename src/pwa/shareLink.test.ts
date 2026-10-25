import { afterEach, describe, expect, it, vi } from 'vitest';
import { linkShareText, shareLink, shareLinkOnWhatsapp, whatsappLinkUrl } from './shareLink';

const share = { title: 'MAKIN', message: 'ثبّت تطبيق MAKIN على هاتفك من هذا الرابط:', url: 'https://makin.example/install' };

afterEach(() => vi.unstubAllGlobals());

describe('what is sent', () => {
  it('puts the link inside the text, on its own line', () => {
    expect(linkShareText(share)).toBe('ثبّت تطبيق MAKIN على هاتفك من هذا الرابط:\nhttps://makin.example/install');
  });

  it('builds a WhatsApp link that carries the whole text, encoded', () => {
    const url = whatsappLinkUrl(share);
    expect(url.startsWith('https://wa.me/?text=')).toBe(true);
    expect(decodeURIComponent(url.slice('https://wa.me/?text='.length))).toBe(linkShareText(share));
    expect(url).not.toMatch(/[\s\n]/);
  });
});

describe('shareLink', () => {
  it('gives the share sheet one text that already holds the link, and no separate url (an iPhone keeps only one of the two)', async () => {
    const nav = { share: vi.fn().mockResolvedValue(undefined), canShare: vi.fn().mockReturnValue(true), clipboard: { writeText: vi.fn() } };
    vi.stubGlobal('navigator', nav);
    await expect(shareLink(share)).resolves.toBe('shared');
    expect(nav.share).toHaveBeenCalledOnce();
    const sent = nav.share.mock.calls[0][0];
    expect(sent.text).toContain('https://makin.example/install');
    expect(sent).not.toHaveProperty('url');
    expect(sent.title).toBe('MAKIN');
    expect(nav.clipboard.writeText).not.toHaveBeenCalled();
  });

  it('does nothing more when the person closes the share sheet', async () => {
    const nav = { share: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' })), clipboard: { writeText: vi.fn() } };
    vi.stubGlobal('navigator', nav);
    await expect(shareLink(share)).resolves.toBe('cancelled');
    expect(nav.clipboard.writeText).not.toHaveBeenCalled();
  });

  it('is never silent when the phone refuses: the link is copied and the result says so', async () => {
    for (const name of ['NotAllowedError', 'TypeError', 'DataError']) {
      const nav = { share: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name })), clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } };
      vi.stubGlobal('navigator', nav);
      await expect(shareLink(share), name).resolves.toBe('copied');
      expect(nav.clipboard.writeText).toHaveBeenCalledWith(linkShareText(share));
    }
  });

  it('copies when the browser says it cannot share this text', async () => {
    const nav = { share: vi.fn(), canShare: vi.fn().mockReturnValue(false), clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } };
    vi.stubGlobal('navigator', nav);
    await expect(shareLink(share)).resolves.toBe('copied');
    expect(nav.share).not.toHaveBeenCalled();
  });

  it('copies on a computer without a share sheet', async () => {
    const nav = { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } };
    vi.stubGlobal('navigator', nav);
    await expect(shareLink(share)).resolves.toBe('copied');
    expect(nav.clipboard.writeText).toHaveBeenCalledWith(linkShareText(share));
  });

  it('says it failed when nothing can share or copy', async () => {
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('document', undefined);
    await expect(shareLink(share)).resolves.toBe('failed');
  });
});

describe('shareLinkOnWhatsapp', () => {
  it('opens WhatsApp with the link ready, in a new tab', () => {
    const open = vi.fn();
    vi.stubGlobal('window', { open });
    expect(shareLinkOnWhatsapp(share)).toBe('whatsapp');
    expect(open).toHaveBeenCalledWith(whatsappLinkUrl(share), '_blank', 'noopener,noreferrer');
  });

  it('fails quietly without a window', () => {
    vi.stubGlobal('window', undefined);
    expect(shareLinkOnWhatsapp(share)).toBe('failed');
  });
});
