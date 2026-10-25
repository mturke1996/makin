import { cn } from '../primitives/cn';

/**
 * Columns follow the width of the block measured in rem, not the width of the screen, so they also follow
 * the text size: at 130% a half-width phone card can no longer hold "−33,211 د.ل" and the cards take a
 * row each, while at normal size the same phone shows two per row (≥ 18rem). Wide blocks use more.
 * The wrapper is the size container; the grid inside reads its width.
 */
export const KPI_CONTAINER = '[container-type:inline-size]';

// Tailwind reads class names from the source text, so every class is written out in full here.
export function kpiGridClass(n: number): string {
  return cn(
    'grid grid-cols-1 gap-2.5',
    '[@container_(min-width:18rem)]:grid-cols-2',
    // an odd last card takes the whole row instead of leaving a hole
    '[@container_(min-width:18rem)]:[&>*:last-child:nth-child(odd)]:col-span-2',
    // wide blocks: one row of four (or three); the odd-card rule stops applying to a full row of three
    n >= 4 && '[@container_(min-width:40rem)]:grid-cols-4',
    n === 3 && '[@container_(min-width:40rem)]:grid-cols-3',
    n === 3 && '[@container_(min-width:40rem)]:[&>*:last-child:nth-child(odd)]:col-span-1',
  );
}
