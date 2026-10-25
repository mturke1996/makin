import { useEffect, useRef, useState } from 'react';

/** Whether the page reads right to left (charts put the newest day on the left then). */
export function useIsRtl(): boolean {
  return typeof document !== 'undefined' && document.documentElement.getAttribute('dir') === 'rtl';
}

/** Width of an element in px, kept up to date. `fallback` is used before the first measurement. */
export function useElementWidth<T extends HTMLElement>(fallback = 320) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(1, Math.round(el.getBoundingClientRect().width)));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}
