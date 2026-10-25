import { Link, useLocation } from 'react-router-dom';
import { Brightness4, Brightness7, Logout } from '../../design-system/icons';
import { LogoMark } from '../brand/LogoMark';
import { Avatar, IconButton } from '../../design-system/primitives';
import { cn } from '../../design-system/primitives/cn';
import { useAuthStore } from '../../stores/useAuthStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { useBrand } from '../../config/BrandProvider';
import { NotificationBell } from '../notifications/NotificationBell';
import { InstallNavButton } from '../../pwa/InstallUi';
import { NavItem, activeNavPath, navLabel } from './navItems';
import { useNavGroups, useNavIdentity } from './useNavAccess';

/**
 * The side navigation. Tablets and small laptops (768 to 1279px, an iPad in either direction) get a slim rail of
 * icons, so the page keeps nearly the whole width; from 1280px it opens into the full sidebar with names and groups.
 * Hidden on phones, where MobileDrawer + MobileBottomNav take over.
 */
export function Sidebar() {
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const { mode, toggleTheme } = useThemeStore();
  const brand = useBrand();
  const rtl = brand.direction === 'rtl';
  const groups = useNavGroups();
  const activePath = activeNavPath(location.pathname, groups.flatMap((g) => g.items));

  const { userName, roleLabel } = useNavIdentity();

  const handleLogout = async () => {
    // Once signed out the router redirects unauthenticated users to /login by itself.
    await logout();
  };

  return (
    <aside
      className={cn(
        'app-shell-sidebar relative z-[1] hidden h-full min-h-0 w-[76px] shrink-0 overflow-hidden xl:w-[272px]',
        'border-e border-border bg-surface-panel md:flex md:flex-col'
      )}
    >
      <div className="flex h-16 shrink-0 items-center justify-center px-4 [@media(max-height:600px)]:h-12 xl:justify-start">
        <Link
          to="/"
          aria-label={brand.name}
          className="-mx-1 flex min-w-0 items-center rounded-md px-1 py-1.5 transition-opacity duration-fast ease-out hover:opacity-80 focus:outline-none focus-visible:shadow-focus"
        >
          <span className="hidden xl:block"><LogoMark size={36} showName /></span>
          <span className="xl:hidden"><LogoMark size={36} /></span>
        </Link>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 pb-3" aria-label={rtl ? 'القائمة الرئيسية' : 'Main navigation'}>
        {groups.map((group, i) => (
          <div key={group.key} role="group" aria-label={group.title} className={cn(i > 0 && 'mt-3 border-t border-border pt-3 xl:mt-4 xl:border-t-0 xl:pt-0')}>
            <p className="hidden px-3 pb-1.5 pt-1 text-2xs font-medium text-fg-muted xl:block">{group.title}</p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <SidebarLink key={item.path} item={item} active={item.path === activePath} label={navLabel(item, brand.direction)} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border p-3 [@media(max-height:600px)]:p-1.5">
        <div className="flex items-center justify-center gap-3 px-1 [@media(max-height:600px)]:hidden xl:justify-start">
          <Avatar name={userName} size="md" />
          <div className="hidden min-w-0 flex-1 xl:block">
            <p className="truncate text-sm font-semibold leading-snug text-fg">{userName}</p>
            <p className="truncate text-2xs text-fg-muted">{roleLabel}</p>
          </div>
        </div>
        <div className="mt-2 flex flex-col items-center gap-1 [@media(max-height:600px)]:mt-0 [@media(max-height:600px)]:grid [@media(max-height:600px)]:grid-cols-2 [@media(max-height:600px)]:justify-items-center xl:flex-row xl:flex-wrap xl:justify-between xl:gap-y-1">
          <NotificationBell size="sm" />
          <IconButton
            size="sm"
            label={mode === 'dark' ? (rtl ? 'الوضع الفاتح' : 'Light mode') : rtl ? 'الوضع الداكن' : 'Dark mode'}
            onClick={toggleTheme}
          >
            {mode === 'dark' ? <Brightness7 sx={{ fontSize: 22 }} /> : <Brightness4 sx={{ fontSize: 22 }} />}
          </IconButton>
          <InstallNavButton layout="icon" />
          <IconButton size="sm" label={rtl ? 'تسجيل الخروج' : 'Sign out'} onClick={handleLogout} className="hover:text-danger-ink">
            <Logout sx={{ fontSize: 22 }} className="rtl-flip" />
          </IconButton>
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({ item, active, label }: { item: NavItem; active: boolean; label: string }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      aria-current={active ? 'page' : undefined}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-12 items-center justify-center gap-3 rounded-md text-sm [@media(max-height:600px)]:h-10 xl:h-11 xl:justify-start xl:px-3',
        'transition-colors duration-fast ease-out focus:outline-none focus-visible:shadow-focus',
        active ? 'bg-accent-soft font-semibold text-accent-ink' : 'font-medium text-fg-subtle hover:bg-surface-hover hover:text-fg'
      )}
    >
      <Icon sx={{ fontSize: 22 }} className="shrink-0" />
      <span className="hidden min-w-0 flex-1 truncate xl:block">{label}</span>
    </Link>
  );
}
