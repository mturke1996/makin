import { forwardRef, HTMLAttributes } from 'react';
import { cn } from './cn';

type Gap = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10;

interface StackProps extends HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'col';
  gap?: Gap;
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
}

const gapMap: Record<Gap, string> = {
  0: 'gap-0', 1: 'gap-1', 2: 'gap-2', 3: 'gap-3', 4: 'gap-4',
  5: 'gap-5', 6: 'gap-6', 8: 'gap-8', 10: 'gap-10',
};

const alignMap = {
  start: 'items-start', center: 'items-center', end: 'items-end',
  stretch: 'items-stretch', baseline: 'items-baseline',
} as const;

const justifyMap = {
  start: 'justify-start', center: 'justify-center', end: 'justify-end',
  between: 'justify-between', around: 'justify-around', evenly: 'justify-evenly',
} as const;

/** Flex container with 8px-grid gaps. Default direction=row. */
export const Stack = forwardRef<HTMLDivElement, StackProps>(function Stack(
  { direction = 'row', gap = 2, align, justify, wrap, className, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        'flex',
        direction === 'col' ? 'flex-col' : 'flex-row',
        gapMap[gap],
        align && alignMap[align],
        justify && justifyMap[justify],
        wrap && 'flex-wrap',
        className
      )}
      {...rest}
    />
  );
});
