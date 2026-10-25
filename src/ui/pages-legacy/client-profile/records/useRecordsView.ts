import { useEffect, useRef, useState } from 'react';

/** Rows drawn at a time; the totals above them always cover every record, drawn or not. */
export const RECORDS_PAGE_SIZE = 40;

/**
 * Puts a sheet's filters back to their start when it closes. Reopening should show the whole list:
 * a filter left on from last time would hide a record that was just added and look like it was lost.
 */
export function useResetOnClose(open: boolean, reset: () => void) {
  const latest = useRef(reset);
  latest.current = reset;
  useEffect(() => {
    if (!open) latest.current();
  }, [open]);
}

/** How many rows to draw. Any change of `resetKey` (a filter, a sort) starts again from one page. */
export function usePagedLimit(resetKey: string): { limit: number; more: () => void } {
  const [state, setState] = useState({ key: resetKey, limit: RECORDS_PAGE_SIZE });
  const limit = state.key === resetKey ? state.limit : RECORDS_PAGE_SIZE;
  return { limit, more: () => setState({ key: resetKey, limit: limit + RECORDS_PAGE_SIZE }) };
}
