import { CSSProperties } from 'react';
import { cn } from './cn';

/** Stable hue (0–359) from a string — same person, same color, everywhere. */
export function hueFromString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) % 360;
  // Nudge away from yellow-green (hard to read) toward calmer hues.
  return h;
}

type Size = 'sm' | 'md' | 'lg' | 'xl';
const sizes: Record<Size, string> = {
  sm: 'h-9 w-9 text-sm',
  md: 'h-11 w-11 text-base',
  lg: 'h-14 w-14 text-xl',
  xl: 'h-20 w-20 text-3xl',
};

interface AvatarProps {
  name: string;
  size?: Size;
  /** `person` = circle, `entity` (company/project) = rounded square. */
  shape?: 'person' | 'entity';
  /** Force a tone instead of the name-derived hue. */
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  className?: string;
}

const toneVars: Record<NonNullable<AvatarProps['tone']>, { bg: string; fg: string }> = {
  brand: { bg: 'var(--accent-soft)', fg: 'var(--accent-ink)' },
  success: { bg: 'var(--success-soft)', fg: 'var(--success-ink)' },
  warning: { bg: 'var(--warning-soft)', fg: 'var(--warning-ink)' },
  danger: { bg: 'var(--danger-soft)', fg: 'var(--danger-ink)' },
  info: { bg: 'var(--info-soft)', fg: 'var(--info-ink)' },
  neutral: { bg: 'var(--surface-sunken)', fg: 'var(--text-secondary)' },
};

/** Initial-in-a-tint avatar. Works in both themes (mixes with surface/text tokens). */
export function Avatar({ name, size = 'md', shape = 'person', tone, className }: AvatarProps) {
  const initial = (name || '?').trim().charAt(0) || '?';
  let style: CSSProperties;
  if (tone) {
    style = { backgroundColor: toneVars[tone].bg, color: toneVars[tone].fg };
  } else {
    const h = hueFromString(name || '?');
    style = {
      backgroundColor: `color-mix(in oklab, oklch(62% 0.13 ${h}) 17%, var(--surface-panel))`,
      color: `color-mix(in oklab, oklch(52% 0.15 ${h}) 72%, var(--text-primary))`,
    };
  }
  return (
    <span
      aria-hidden
      style={style}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center font-bold',
        shape === 'person' ? 'rounded-full' : 'rounded-lg',
        sizes[size],
        className
      )}
    >
      {initial}
    </span>
  );
}
