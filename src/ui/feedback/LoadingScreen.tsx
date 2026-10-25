import { useEffect, useRef } from 'react';
import { useBrand } from '../../config/BrandProvider';
import { LogoMark } from '../brand/LogoMark';

/**
 * Cold-start / auth splash: the mark, the name, and one quiet progress sweep (transform only).
 */
export function LoadingScreen() {
  const brand = useBrand();
  const rtl = brand.direction === 'rtl';
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = barRef.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const sweep = el.animate(
      [{ transform: 'translateX(-100%)' }, { transform: 'translateX(250%)' }],
      { duration: 1400, iterations: Infinity, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' }
    );
    return () => sweep.cancel();
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-surface-canvas px-6"
      role="status"
      aria-busy="true"
      aria-label={rtl ? 'جاري التحميل' : 'Loading'}
    >
      <div className="animate-fade-in flex flex-col items-center gap-4">
        <LogoMark size={72} />
        <p className="text-lg font-bold text-fg">{brand.name}</p>
      </div>
      <div dir="ltr" className="h-1 w-32 overflow-hidden rounded-full bg-surface-sunken" aria-hidden>
        <div ref={barRef} className="h-full w-2/5 rounded-full bg-accent" />
      </div>
    </div>
  );
}
