import type { ReactNode } from 'react';
import { useBrand } from '../../config/BrandProvider';
import { cn } from '../../design-system/primitives/cn';

/** `t(ar, en)`: the settings screens follow the brand direction (Arabic first). */
export function useBrandT() {
  const rtl = useBrand().direction === 'rtl';
  return (ar: string, en: string) => (rtl ? ar : en);
}

/** LTR values (email, URL, phone, hex) inside an RTL form: right-aligned like the labels. */
export const LTR_FIELD = 'text-end';

/** One surface that holds the fields of a settings group. */
export function SettingsPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-4 rounded-lg border border-border bg-surface-panel p-4 sm:p-5', className)}>{children}</div>
  );
}

/** Small heading that splits a panel into parts (no extra box). */
export function PanelHeading({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-semibold text-fg">{children}</h3>;
}
