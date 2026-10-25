import { useState } from 'react';
import { useBrand } from '../../config/BrandProvider';
import { cn } from '../../design-system/primitives/cn';
import { useThemeStore } from '../../stores/useThemeStore';

interface LogoMarkProps {
  size?: number;
  /** Include the brand name alongside the mark. */
  showName?: boolean;
  /** Variant for surfaces filled with the accent color (uses the dark logo and accent-on text). */
  inverted?: boolean;
  className?: string;
}

/**
 * ============================================================================
 *  LogoMark — the single brand surface for the app
 * ============================================================================
 *  Reads `brand.logo` from the active BrandConfig. Tries the image first,
 *  falls back to a flat letter tile built from `brand.logo.letter` and the
 *  accent color. The name is shown on its own (no tagline) to keep chrome calm.
 *
 *  Drop this anywhere a logo is needed. Never import a raw <img> elsewhere.
 * ============================================================================
 */
export function LogoMark({ size = 40, showName, inverted, className }: LogoMarkProps) {
  const brand = useBrand();
  const { mode } = useThemeStore();
  const [failed, setFailed] = useState(false);
  const isDark = mode === 'dark' || inverted;
  const src = isDark && brand.logo.srcDark ? brand.logo.srcDark : brand.logo.src;

  const letterTile = (
    <div
      style={{ width: size, height: size, fontSize: Math.round(size * 0.48) }}
      className="flex shrink-0 select-none items-center justify-center rounded-md bg-accent font-bold text-accent-on"
      aria-hidden
    >
      {brand.logo.letter}
    </div>
  );

  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      {failed || !src ? (
        letterTile
      ) : (
        <img
          src={src}
          alt={showName ? '' : brand.logo.alt}
          width={size}
          height={size}
          onError={() => setFailed(true)}
          style={{ width: size, height: size, objectFit: 'contain' }}
          className="shrink-0 rounded-md"
        />
      )}
      {showName && (
        <span className={cn('truncate text-base font-bold leading-tight', inverted ? 'text-accent-on' : 'text-fg')}>
          {brand.name}
        </span>
      )}
    </div>
  );
}
