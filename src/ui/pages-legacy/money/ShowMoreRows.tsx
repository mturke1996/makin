import { Button } from '../../../design-system/primitives';

/** «عرض المزيد (60 من 240 متبقية)»: the end of a ledger that draws a page of rows at a time. */
export function ShowMoreRows({ hidden, pageSize, noun, onMore }: { hidden: number; pageSize: number; noun: string; onMore: () => void }) {
  if (hidden <= 0) return null;
  return (
    <div className="flex flex-col items-center gap-1 pt-3">
      <Button variant="outline" onClick={onMore}>
        عرض {Math.min(pageSize, hidden)} {noun} أخرى
      </Button>
      <p className="text-2xs text-fg-muted" aria-live="polite">متبقٍ {hidden} {noun} لم تُعرض بعد</p>
    </div>
  );
}
