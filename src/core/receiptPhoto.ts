/**
 * A photo of a receipt taken on a phone is several megabytes; what is needed is that the figures stay readable.
 * It is scaled to fit this many pixels on its longer side and saved as a JPEG, which brings it to a few hundred
 * kilobytes (quick to upload on a site connection, far below the 10 MB storage limit).
 */
export const RECEIPT_MAX_SIDE = 1600;
export const RECEIPT_JPEG_QUALITY = 0.72;
/** Picked files above this are refused before any work is done (a camera roll video, a scan of a book). */
export const RECEIPT_MAX_INPUT_BYTES = 25 * 1024 * 1024;

/** The size of an image after fitting it within `max` pixels on its longer side; never enlarged. */
export function fitWithin(width: number, height: number, max = RECEIPT_MAX_SIDE): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width: 0, height: 0 };
  const longer = Math.max(width, height);
  if (longer <= max) return { width: Math.round(width), height: Math.round(height) };
  const scale = max / longer;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export type ReceiptCheck = { ok: true } | { ok: false; reason: string };

/** Only pictures are kept as receipts (a PDF attached to an older expense stays as it is). */
export function checkReceiptFile(file: { type: string; size: number }): ReceiptCheck {
  if (!file.type.startsWith('image/')) return { ok: false, reason: 'اختر صورة للفاتورة (JPG أو PNG).' };
  if (file.size > RECEIPT_MAX_INPUT_BYTES) return { ok: false, reason: 'الصورة كبيرة جداً، صوّرها من جديد.' };
  return { ok: true };
}

/** Scales the picture down and re-encodes it as JPEG. The camera's rotation is honoured by the browser on decode. */
export async function compressReceiptImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas-unavailable');
    // JPEG has no transparency: a PNG screenshot would otherwise turn black behind its figures.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', RECEIPT_JPEG_QUALITY));
    if (!blob) throw new Error('encode-failed');
    return blob;
  } finally {
    bitmap.close();
  }
}
