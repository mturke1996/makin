import { ReactNode } from 'react';
import { cn } from './cn';

type Props = {
  children: ReactNode;
  className?: string;
  /** Content width cap. Default 6xl. */
  width?: '4xl' | '5xl' | '6xl' | '7xl';
};

const WIDTH: Record<NonNullable<Props['width']>, string> = {
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
};

/**
 * PageShell — consistent page frame: 16px gutters on phones, 24–32px above,
 * 24px vertical rhythm between top-level blocks.
 */
export function PageShell({ children, className, width = '6xl' }: Props) {
  return (
    <div className={cn('mx-auto space-y-5 px-4 pb-10 pt-3 sm:space-y-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-6', WIDTH[width], className)}>
      {children}
    </div>
  );
}
