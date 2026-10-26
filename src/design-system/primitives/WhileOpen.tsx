import type { ReactNode } from 'react';
import { useMountTransition } from '../utils/useMountTransition';

/**
 * Renders a sheet only while it is open (and while it plays its exit animation). A closed sheet that stays mounted
 * still runs all of its hooks on every change of the data it was given, which on a page with a dozen sheets is
 * most of the work done after each save.
 */
export function WhileOpen({ open, children }: { open: boolean; children: ReactNode }) {
  const { mounted } = useMountTransition(open, 300);
  return mounted ? <>{children}</> : null;
}
