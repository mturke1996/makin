import { Skeleton } from '../../design-system/primitives';

/**
 * What the page area shows while a screen's code is on its way: the shell (menus, bars) stays where it is and
 * only this block waits, in the shape of a page (title, a row of figures, a list), never a full-screen splash.
 */
export function PageFallback() {
  return (
    <div role="status" aria-busy="true" aria-label="جاري تحميل الصفحة" className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6">
      <div className="space-y-2">
        <Skeleton height={24} width="38%" />
        <Skeleton height={13} width="55%" />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Skeleton height={104} className="rounded-lg" />
        <Skeleton height={104} className="rounded-lg" />
      </div>
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={56} className="rounded-lg" />
        ))}
      </div>
    </div>
  );
}
