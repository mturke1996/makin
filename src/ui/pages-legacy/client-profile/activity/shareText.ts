/**
 * Hands a plain-text statement to the outside world: the system share sheet when the browser has
 * one, WhatsApp's web link otherwise, or the clipboard. No dependencies, no store access.
 */

export type ShareResult = 'shared' | 'whatsapp' | 'cancelled' | 'failed';

/** `https://wa.me/?text=...`: opens WhatsApp with the text ready to send to anyone. */
export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function openWhatsapp(text: string): ShareResult {
  if (typeof window === 'undefined' || typeof window.open !== 'function') return 'failed';
  // `noopener` makes some browsers return null even when the tab opened, so the result is not checked.
  window.open(whatsappShareUrl(text), '_blank', 'noopener,noreferrer');
  return 'whatsapp';
}

/**
 * Web Share API when present (the person picks the app), else WhatsApp. `cancelled` means the person
 * closed the share sheet on purpose: nothing to report.
 */
export async function shareText(text: string, title: string): Promise<ShareResult> {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  if (nav && typeof nav.share === 'function') {
    try {
      const data = { title, text };
      if (typeof nav.canShare === 'function' && !nav.canShare(data)) return openWhatsapp(text);
      await nav.share(data);
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
      return openWhatsapp(text);
    }
  }
  return openWhatsapp(text);
}

/** Copies text to the clipboard. Returns whether it worked. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Falls through to the legacy path (insecure origin, permission denied).
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
