import type { ComponentType } from 'react';
import { cn } from '../../design-system/primitives/cn';

export type IconTileTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

const toneClass: Record<IconTileTone, string> = {
  neutral: 'bg-surface-sunken text-fg-subtle',
  brand: 'bg-accent-soft text-accent-ink',
  success: 'bg-success-soft text-success-ink',
  warning: 'bg-warning-soft text-warning-ink',
  danger: 'bg-danger-soft text-danger-ink',
  info: 'bg-info-soft text-info-ink',
};

interface HomeIconTileProps {
  Icon: ComponentType<{ sx?: object; className?: string }>;
  tone?: IconTileTone;
  className?: string;
}

/** 40px rounded tile that carries a row's icon (leading slot of `ListRow`). */
export function HomeIconTile({ Icon, tone = 'neutral', className }: HomeIconTileProps) {
  return (
    <span
      aria-hidden
      className={cn('inline-flex h-10 w-10 items-center justify-center rounded-md', toneClass[tone], className)}
    >
      <Icon sx={{ fontSize: 22 }} />
    </span>
  );
}
