import { useCallback, useState } from 'react';

/**
 * "Show more" windowing for long lists: how many rows to render now. The count starts over whenever
 * `resetKey` changes (a filter, a search), without an effect: the stored key is compared on render.
 */
export function useVisibleCount(resetKey: string, pageSize = 60) {
  const [state, setState] = useState({ key: resetKey, count: pageSize });
  const count = state.key === resetKey ? state.count : pageSize;
  const showMore = useCallback(() => setState({ key: resetKey, count: count + pageSize }), [resetKey, count, pageSize]);
  return { count, showMore, pageSize };
}

/** Arabic count of rows left to show: «60 حركة متبقية». */
export function remainingPhrase(n: number, noun: { one: string; two: string; few: string; many: string }): string {
  if (n === 1) return `${noun.one} متبقية`;
  if (n === 2) return `${noun.two} متبقيتان`;
  return `${n} ${n <= 10 ? noun.few : noun.many} متبقية`;
}
