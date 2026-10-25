/**
 * Sharing the link of the system (the install page) from a phone.
 *
 * The link is written INTO the shared text, and the share sheet is given that text alone. Handing it a separate `url`
 * as well looks tidier, but on an iPhone several targets (WhatsApp, Messages, Notes) keep one of the two and drop
 * the other, so the message arrives without the link. A text that already contains the link reaches every app whole.
 */

export type ShareLinkResult = 'shared' | 'cancelled' | 'copied' | 'whatsapp' | 'failed';

export interface LinkShare {
  /** Heading some apps show above the shared text (e-mail subject, a note's title). */
  title: string;
  /** The sentence before the link, without the link itself. */
  message: string;
  url: string;
}

/** What is actually sent: the sentence, then the link on its own line, so a chat app turns it into a tappable link. */
export const linkShareText = ({ message, url }: Pick<LinkShare, 'message' | 'url'>) => `${message}\n${url}`;

/** WhatsApp with the text ready to send to anyone: the way that works on an iPhone even when the share sheet does not. */
export const whatsappLinkUrl = (share: Pick<LinkShare, 'message' | 'url'>) => `https://wa.me/?text=${encodeURIComponent(linkShareText(share))}`;

async function copy(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // falls through to the old way (an insecure origin, a refused permission)
  }
  if (typeof document === 'undefined') return false;
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.cssText = 'position:fixed;top:0;opacity:0;pointer-events:none';
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(area);
  }
}

/**
 * The system share sheet when there is one. Closing it on purpose is `cancelled` and nothing more happens; any other
 * refusal (the browser says it cannot share this, the tap was too long ago) is not silence: the text is copied so the
 * link still leaves the screen, and the result says so. Without a share sheet (a computer) the text is copied.
 */
export async function shareLink(share: LinkShare): Promise<ShareLinkResult> {
  const text = linkShareText(share);
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  if (nav && typeof nav.share === 'function') {
    const data = { title: share.title, text };
    try {
      if (typeof nav.canShare === 'function' && !nav.canShare(data)) throw new Error('cannot-share');
      await nav.share(data);
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
    }
  }
  return (await copy(text)) ? 'copied' : 'failed';
}

/** Opens WhatsApp with the link ready to send. */
export function shareLinkOnWhatsapp(share: Pick<LinkShare, 'message' | 'url'>): ShareLinkResult {
  if (typeof window === 'undefined' || typeof window.open !== 'function') return 'failed';
  // `noopener` makes some browsers return null even when the tab opened, so the result is not checked.
  window.open(whatsappLinkUrl(share), '_blank', 'noopener,noreferrer');
  return 'whatsapp';
}
