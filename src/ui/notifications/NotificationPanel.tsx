import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  Error as ErrorIcon,
  Info,
  WarningAmber,
  DeleteOutline,
  DoneAll,
  GetApp,
  NotificationsNone,
  NotificationsActive,
} from '../../design-system/icons';
import { useShallow } from 'zustand/react/shallow';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ar';
import { useNotificationStore, type InAppNotification } from '../../stores/useNotificationStore';
import { useNotificationPanelStore } from '../../stores/useNotificationPanelStore';
import { useBrand } from '../../config/BrandProvider';
import { Button, EmptyState, IconButton, ListGroup, ListRow, Sheet } from '../../design-system/primitives';
import { cn } from '../../design-system/primitives/cn';
import { hasVapidConfigured, requestPushAndRegisterToken, getStoredFcmToken } from '../../core/push/fcmClient';

dayjs.extend(relativeTime);

const typeStyle: Record<InAppNotification['type'], { Icon: typeof Info; tone: string }> = {
  success: { Icon: CheckCircle, tone: 'bg-success-soft text-success-ink' },
  error: { Icon: ErrorIcon, tone: 'bg-danger-soft text-danger-ink' },
  warning: { Icon: WarningAmber, tone: 'bg-warning-soft text-warning-ink' },
  info: { Icon: Info, tone: 'bg-info-soft text-info-ink' },
};

type BeforeInstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * Notification center: unread-first feed in a sheet, plus device options (install, web push) below it.
 */
export function NotificationPanel() {
  const open = useNotificationPanelStore((s) => s.open);
  const onClose = useCallback(() => useNotificationPanelStore.getState().setOpen(false), []);
  const brand = useBrand();
  const rtl = brand.direction === 'rtl';
  const navigate = useNavigate();
  const { items, markRead, markAllRead, remove, clear } = useNotificationStore(
    useShallow((s) => ({
      items: s.items,
      markRead: s.markRead,
      markAllRead: s.markAllRead,
      remove: s.remove,
      clear: s.clear,
    }))
  );

  const [pwaInstall, setPwaInstall] = useState<BeforeInstallPrompt | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const vapid = hasVapidConfigured();
  const fcmToken = getStoredFcmToken();

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      setPwaInstall(e as BeforeInstallPrompt);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  const onInstallPwa = useCallback(async () => {
    if (!pwaInstall) return;
    try {
      await pwaInstall.prompt();
      setPwaInstall(null);
    } catch {
      setPwaInstall(null);
    }
  }, [pwaInstall]);

  const onEnablePush = useCallback(async () => {
    if (!vapid) {
      toast.error(rtl ? 'أضف VAPID في ملف البيئة (انظر .env.example)' : 'Add VAPID key to env');
      return;
    }
    setPushBusy(true);
    try {
      const r = await requestPushAndRegisterToken();
      if (r.ok === false) {
        if (r.reason === 'denied') {
          toast.error(rtl ? 'رُفض الإذن من المتصفح' : 'Notification permission denied');
        } else {
          toast.error(r.message || (rtl ? 'تعذر التفعيل' : 'Could not enable'));
        }
      } else {
        toast.success(rtl ? 'تم تفعيل إشعارات المتصفح' : 'Browser notifications enabled');
      }
    } finally {
      setPushBusy(false);
    }
  }, [rtl, vapid]);

  dayjs.locale(brand.locale?.startsWith('ar') ? 'ar' : 'en');

  const unread = items.filter((i) => !i.read).length;
  const hasDeviceOptions = Boolean(pwaInstall) || vapid;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      mobile="bottom"
      maxWidth="sm"
      rtl={rtl}
      title={rtl ? 'الإشعارات' : 'Notifications'}
      subtitle={unread > 0 ? (rtl ? `${unread} غير مقروء` : `${unread} unread`) : undefined}
      headerAction={
        items.length > 0 && (
          <div className="flex items-center gap-1">
            {unread > 0 && (
              <IconButton label={rtl ? 'تعليم الكل كمقروء' : 'Mark all read'} onClick={() => markAllRead()}>
                <DoneAll sx={{ fontSize: 22 }} />
              </IconButton>
            )}
            <Button variant="ghost" size="sm" onClick={() => clear()} className="min-h-11">
              {rtl ? 'مسح الكل' : 'Clear all'}
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-6 p-4 pb-[max(24px,env(safe-area-inset-bottom))]">
        {items.length === 0 ? (
          <EmptyState
            bare
            Icon={NotificationsNone}
            title={rtl ? 'لا توجد إشعارات بعد' : 'No notifications yet'}
            description={
              rtl
                ? 'تظهر هنا تنبيهات الدفعات والعهد وكل ما يحتاج متابعتك.'
                : 'Payment, custody and follow-up alerts will appear here.'
            }
          />
        ) : (
          <ListGroup role="list">
            {items.map((n) => (
              <NotificationRow
                key={n.id}
                n={n}
                rtl={rtl}
                onOpen={() => {
                  markRead(n.id);
                  if (n.href) {
                    onClose();
                    navigate(n.href);
                  }
                }}
                onRemove={() => remove(n.id)}
              />
            ))}
          </ListGroup>
        )}

        {hasDeviceOptions && (
          <section className="space-y-2">
            <h3 className="px-1 text-sm font-semibold text-fg-subtle">{rtl ? 'تنبيهات الجهاز' : 'Device alerts'}</h3>
            <ListGroup>
              {pwaInstall && (
                <ListRow
                  density="compact"
                  leading={<RowIcon><GetApp sx={{ fontSize: 22 }} /></RowIcon>}
                  title={rtl ? 'تثبيت التطبيق' : 'Install app'}
                  subtitle={rtl ? 'أيقونة على الشاشة الرئيسية وفتح أسرع' : 'Home screen icon, faster launch'}
                  onClick={onInstallPwa}
                />
              )}
              {vapid && (
                <ListRow
                  density="compact"
                  leading={<RowIcon><NotificationsActive sx={{ fontSize: 22 }} /></RowIcon>}
                  title={rtl ? 'إشعارات المتصفح' : 'Browser notifications'}
                  subtitle={
                    fcmToken
                      ? rtl
                        ? 'مفعّلة على هذا الجهاز'
                        : 'On for this device'
                      : rtl
                        ? 'تنبيهات من الخادم، تحتاج إذن المتصفح'
                        : 'Server alerts, needs browser permission'
                  }
                  trailing={
                    <Button variant="secondary" loading={pushBusy} onClick={() => void onEnablePush()}>
                      {fcmToken ? (rtl ? 'تحديث' : 'Refresh') : rtl ? 'تفعيل' : 'Enable'}
                    </Button>
                  }
                />
              )}
            </ListGroup>
          </section>
        )}

        <p className="px-1 text-center text-xs leading-relaxed text-fg-muted">
          {rtl ? 'السجل محفوظ على هذا الجهاز فقط.' : 'History is stored on this device only.'}
        </p>
      </div>
    </Sheet>
  );
}

function RowIcon({ children }: { children: ReactNode }) {
  return <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent-ink">{children}</span>;
}

function NotificationRow({
  n,
  rtl,
  onOpen,
  onRemove,
}: {
  n: InAppNotification;
  rtl: boolean;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const { Icon, tone } = typeStyle[n.type] ?? typeStyle.info;
  return (
    <div role="listitem" className="flex items-stretch">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-[4.5rem] min-w-0 flex-1 items-start gap-3 py-3 ps-4 text-start transition-colors duration-fast ease-out hover:bg-surface-hover focus:outline-none focus-visible:shadow-[inset_var(--brand-focus-ring)]"
      >
        <span className={cn('relative mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full', tone)} aria-hidden>
          <Icon sx={{ fontSize: 22 }} />
          {!n.read && <span className="absolute -start-0.5 -top-0.5 size-3 rounded-full bg-accent ring-2 ring-[color:var(--surface-panel)]" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-2">
            <span className={cn('min-w-0 flex-1 text-base leading-snug', n.read ? 'font-medium text-fg-subtle' : 'font-semibold text-fg')}>
              {n.title}
            </span>
            {!n.read && <span className="sr-only">{rtl ? 'غير مقروء' : 'Unread'}</span>}
          </span>
          {n.body && <span className="mt-0.5 line-clamp-2 block text-sm leading-relaxed text-fg-subtle">{n.body}</span>}
          <span className="mt-1 block text-xs text-fg-muted">
            {n.source === 'push' && <span className="me-2 font-medium text-info-ink">{rtl ? 'إشعار ويب' : 'Push'}</span>}
            {dayjs(n.createdAt).fromNow()}
          </span>
        </span>
      </button>
      <IconButton label={rtl ? 'حذف الإشعار' : 'Remove'} onClick={onRemove} className="my-1.5 me-1 self-start">
        <DeleteOutline sx={{ fontSize: 22 }} />
      </IconButton>
    </div>
  );
}
