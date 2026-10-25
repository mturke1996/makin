/** The shape (height ÷ width) of the letterhead logo file, used when the image itself cannot be measured. */
export const LOGO_FALLBACK_RATIO = 391 / 1200;

/**
 * Height ÷ width of the PNG a data URI holds, read from its header, so a logo is drawn in its own shape
 * whatever file it is. Anything else (or an unreadable header) gives `fallback`.
 */
export function imageRatioOf(src: string | null | undefined, fallback = LOGO_FALLBACK_RATIO): number {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/]{44})/.exec(src ?? '');
  if (!match) return fallback;
  try {
    const bytes = Uint8Array.from(atob(match[1]), (ch) => ch.charCodeAt(0));
    // 8-byte signature, 4-byte length, "IHDR", then width and height as big-endian 32-bit integers.
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const view = new DataView(bytes.buffer);
    const width = view.getUint32(16);
    const height = view.getUint32(20);
    return isPng && width > 0 && height > 0 ? height / width : fallback;
  } catch {
    return fallback;
  }
}
