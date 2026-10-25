// @ts-nocheck
import React from 'react';
import { Path, Svg } from '@react-pdf/renderer';
import qrcode from 'qrcode-generator';

/**
 * A QR code drawn as one vector path (no image to fetch, sharp at any size). Dark runs along a row are
 * merged into one rectangle, so a code stays a few hundred path commands.
 */
export function PdfQr({ value, size = 64, color = '#1F2633' }: { value: string; size?: number; color?: string }) {
  const qr = qrcode(0, 'M');
  qr.addData(value);
  qr.make();
  const n = qr.getModuleCount();
  const quiet = 2;
  const total = n + quiet * 2;
  let d = '';
  for (let r = 0; r < n; r += 1) {
    let c = 0;
    while (c < n) {
      if (!qr.isDark(r, c)) {
        c += 1;
        continue;
      }
      const start = c;
      while (c < n && qr.isDark(r, c)) c += 1;
      d += `M${start + quiet} ${r + quiet}h${c - start}v1h-${c - start}z`;
    }
  }
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${total} ${total}`}>
      <Path d={d} fill={color} />
    </Svg>
  );
}
