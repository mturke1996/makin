import { Notifications } from '../../design-system/icons';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useNotificationPanelStore } from '../../stores/useNotificationPanelStore';
import { useBrand } from '../../config/BrandProvider';
import { IconButton } from '../../design-system/primitives';
import { cn } from '../../design-system/primitives/cn';

export interface NotificationBellProps {
  className?: string;
  /** `md` 44px (phones), `sm` 40px (desktop sidebar). */
  size?: 'sm' | 'md';
}

/**
 * Opens the in-app notification sheet; shows the unread count as a small pill.
 */
export function NotificationBell({ className, size = 'md' }: NotificationBellProps) {
  const setOpen = useNotificationPanelStore((s) => s.setOpen);
  const brand = useBrand();
  const rtl = brand.direction === 'rtl';
  const unread = useNotificationStore((s) => s.items.filter((i) => !i.read).length);

  const base = rtl ? 'الإشعارات' : 'Notifications';
  const label = unread > 0 ? (rtl ? `${base}، ${unread} غير مقروء` : `${base}, ${unread} unread`) : base;

  return (
    <IconButton size={size} className={cn('relative', className)} label={label} onClick={() => setOpen(true)}>
      <Notifications sx={{ fontSize: 24 }} />
      {unread > 0 && (
        <span
          aria-hidden
          className="absolute end-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-2xs font-semibold leading-none text-accent-on tabular-nums"
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </IconButton>
  );
}
