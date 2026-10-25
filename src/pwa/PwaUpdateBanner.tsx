import { SystemUpdateAlt } from '@mui/icons-material';
import { Button } from '../design-system/primitives';

/**
 * «يتوفر تحديث جديد»: shown when a newer version is downloaded. It floats above the bottom navigation on phones
 * and at the inline end on desktop, and stays until the person updates or dismisses it.
 */
export function PwaUpdateBanner({ onUpdate, onDismiss }: { onUpdate: () => void; onDismiss: () => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] z-[1200] rounded-xl border border-border bg-surface-panel p-4 shadow-lg lg:inset-x-auto lg:bottom-6 lg:end-6 lg:w-[24rem]"
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid size-10 flex-none place-items-center rounded-lg bg-accent-soft text-accent-ink">
          <SystemUpdateAlt sx={{ fontSize: 22 }} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-fg">يتوفر تحديث جديد</p>
          <p className="mt-0.5 text-sm text-fg-subtle">حدّث الآن لترى آخر التحسينات. لن تضيع بياناتك المحفوظة.</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onDismiss}>
          لاحقاً
        </Button>
        <Button onClick={onUpdate}>تحديث الآن</Button>
      </div>
    </div>
  );
}
