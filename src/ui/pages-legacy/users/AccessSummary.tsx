import { VerifiedUserOutlined } from '@mui/icons-material';
import type { Permission } from '../../../core/access';
import { cn } from '../../../design-system/primitives/cn';
import { EXPENSE_VISIBILITY_LABEL, describeAccess, permissionCountLabel } from './accessSummaryModel';

/**
 * Live one-line summary of an employee's selection: how much they can do and whose expenses they see.
 * `sticky` pins it under the sheet header while the switches scroll past, so every tap shows its effect.
 */
export function AccessSummaryBar({ permissions, sticky }: { permissions: readonly Permission[]; sticky?: boolean }) {
  const access = describeAccess('employee', permissions);
  const empty = access.count === 0;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-2.5',
        sticky
          ? 'sticky top-0 z-10 -mx-4 border-b border-border bg-surface-canvas px-4 lg:-mx-6 lg:px-6'
          : 'rounded-lg bg-surface-sunken px-4'
      )}
    >
      <span className="text-sm font-semibold text-fg">
        {empty ? 'لم تُمنح أي صلاحية بعد' : `يستطيع: ${permissionCountLabel(access.count)}`}
      </span>
      {!empty && (
        <>
          <span aria-hidden className="text-fg-muted">·</span>
          <span className="text-xs text-fg-subtle">{EXPENSE_VISIBILITY_LABEL[access.expenses]}</span>
        </>
      )}
    </div>
  );
}

/** Shown in place of the permission switches for an administrator. */
export function AdminAccessNote({ own }: { own?: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-surface-sunken p-4">
      <span className="flex size-10 flex-none items-center justify-center rounded-full bg-accent-soft text-accent-ink">
        <VerifiedUserOutlined sx={{ fontSize: 22 }} />
      </span>
      <div className="min-w-0 space-y-1">
        <p className="text-base font-semibold text-fg">{own ? 'أنت مدير: لديك كل الصلاحيات' : 'المدير يستطيع كل شيء'}</p>
        <p className="text-sm leading-relaxed text-fg-subtle">
          يصل إلى كل الأقسام، ويدير المستخدمين والإعدادات وسجل التدقيق. لا توجد صلاحيات لضبطها.
        </p>
      </div>
    </div>
  );
}
