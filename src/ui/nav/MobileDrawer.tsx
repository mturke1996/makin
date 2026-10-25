import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { Brightness4, Brightness7, Close, Logout } from '../../design-system/icons';
import { Avatar, IconButton } from '../../design-system/primitives';
import { cn } from '../../design-system/primitives/cn';
import { useMountTransition } from '../../design-system/utils/useMountTransition';
import { useBackDismiss } from '../../design-system/utils/useBackDismiss';
import { useScrollLockCounter } from '../hooks/useScrollLockCounter';
import { useBrand } from '../../config/BrandProvider';
import { useAuthStore } from '../../stores/useAuthStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { InstallNavButton } from '../../pwa/InstallUi';
import { NavItem, activeNavPath, navLabel } from './navItems';
import { useNavGroups, useNavIdentity } from './useNavAccess';

interface Props {
  open: boolean;
  onClose: () => void;
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Phone drawer: user header, every destination as a 52px row, quiet utilities, sign out last.
 * Slides in from the start edge (transform only), closes on scrim, Escape and Android Back,
 * and returns focus to whatever opened it.
 */
export function MobileDrawer({ open, onClose }: Props) {
  const brand = useBrand();
  const rtl = brand.direction === 'rtl';
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const { mode, toggleTheme } = useThemeStore();
  const { userName, roleLabel } = useNavIdentity();
  const groups = useNavGroups();
  const activePath = activeNavPath(location.pathname, groups.flatMap((g) => g.items));

  const { mounted } = useMountTransition(open, 220);
  const [entered, setEntered] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useScrollLockCounter(open);
  useBackDismiss(open, onClose);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const opener = document.activeElement as HTMLElement | null;
    let inner = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => {
        setEntered(true);
        panelRef.current?.focus({ preventScroll: true });
      });
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.cancelAnimationFrame(outer);
      window.cancelAnimationFrame(inner);
      document.removeEventListener('keydown', onKey);
      opener?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!mounted) return null;

  const visible = open && entered;

  const handleLogout = async () => {
    // Close first; once signed out the router redirects unauthenticated users to /login by itself.
    onClose();
    await logout();
  };

  return createPortal(
    <div className="fixed inset-0 z-[1150] touch-manipulation lg:hidden" role="dialog" aria-modal="true" aria-label={rtl ? 'القائمة' : 'Menu'}>
      <div
        aria-hidden
        onClick={onClose}
        className={cn('absolute inset-0 bg-surface-scrim transition-opacity ease-out', visible ? 'opacity-100 duration-base' : 'opacity-0 duration-fast')}
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'absolute inset-y-0 start-0 flex w-[min(88vw,22.5rem)] flex-col rounded-e-2xl bg-surface-panel shadow-xl outline-none',
          'transition-transform will-change-transform',
          visible ? 'translate-x-0 duration-slow ease-ios' : 'duration-base ease-in ltr:-translate-x-full rtl:translate-x-full'
        )}
      >
        <header className="pwa-safe-top shrink-0 border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <Avatar name={userName} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-md font-semibold leading-snug text-fg">{userName}</p>
              <p className="truncate text-xs text-fg-muted">{roleLabel}</p>
            </div>
            <IconButton label={rtl ? 'إغلاق' : 'Close'} onClick={onClose}>
              <Close sx={{ fontSize: 24 }} />
            </IconButton>
          </div>
        </header>

        <nav
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-2"
          aria-label={rtl ? 'القائمة' : 'Navigation'}
        >
          {groups.map((group) => (
            <div key={group.key} role="group" aria-label={group.title} className="mt-3 first:mt-1">
              <p className="px-3 pb-1.5 pt-1 text-2xs font-medium text-fg-muted">{group.title}</p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <DrawerLink
                    key={item.path}
                    item={item}
                    label={navLabel(item, brand.direction)}
                    active={item.path === activePath}
                    onNavigate={onClose}
                  />
                ))}
              </div>
            </div>
          ))}

          <div className="mt-3 flex flex-col gap-0.5 border-t border-border pt-3 empty:hidden">
            <InstallNavButton onDone={onClose} />
          </div>
        </nav>

        <footer className="grid shrink-0 grid-cols-2 gap-1 border-t border-border px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
          <DrawerAction
            icon={mode === 'dark' ? <Brightness7 sx={{ fontSize: 22 }} /> : <Brightness4 sx={{ fontSize: 22 }} />}
            label={mode === 'dark' ? (rtl ? 'الوضع الفاتح' : 'Light mode') : rtl ? 'الوضع الداكن' : 'Dark mode'}
            onClick={toggleTheme}
          />
          <DrawerAction
            icon={<Logout sx={{ fontSize: 22 }} className="rtl-flip" />}
            label={rtl ? 'تسجيل الخروج' : 'Sign out'}
            onClick={handleLogout}
            danger
          />
        </footer>
      </div>
    </div>,
    document.body
  );
}

function DrawerLink({
  item,
  label,
  active,
  onNavigate,
}: {
  item: NavItem;
  label: string;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-[52px] items-center gap-3 rounded-md px-3 text-base',
        'transition-colors duration-fast ease-out focus:outline-none focus-visible:shadow-focus',
        active ? 'bg-accent-soft font-semibold text-accent-ink' : 'font-medium text-fg-subtle hover:bg-surface-hover hover:text-fg'
      )}
    >
      <Icon sx={{ fontSize: 22 }} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </Link>
  );
}

function DrawerAction({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-[52px] w-full flex-col items-center justify-center gap-0.5 rounded-md px-2 py-2 text-center text-sm font-medium leading-snug',
        'transition-colors duration-fast ease-out focus:outline-none focus-visible:shadow-focus',
        danger ? 'text-danger-ink hover:bg-danger-soft' : 'text-fg-subtle hover:bg-surface-hover hover:text-fg'
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0">{label}</span>
    </button>
  );
}
