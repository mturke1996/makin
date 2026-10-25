import { Link, useLocation } from 'react-router-dom';
import { Menu as MenuIcon } from '@mui/icons-material';
import { BOTTOM_NAV_MIN, activeNavPath, navLabel } from './navItems';
import { useBottomNavItems } from './useNavAccess';
import { useNavDrawer } from './useNavDrawer';
import { cn } from '../../design-system/primitives/cn';
import { useBrand } from '../../config/BrandProvider';

interface MobileBottomNavProps {
  /** Optional attention dots keyed by destination path, e.g. { '/fund': true }. */
  badges?: Record<string, boolean>;
}

/**
 * MobileBottomNav: up to five destinations, 64px tall + safe area.
 * It lists only what this person may open (standard five, topped up with the next allowed ones),
 * so a locked destination never appears. With fewer than two destinations it adds a menu button.
 * The active tab gets a tinted pill behind the icon (transform/opacity) and a heavier label.
 */
export function MobileBottomNav({ badges }: MobileBottomNavProps) {
  const brand = useBrand();
  const { pathname } = useLocation();
  const items = useBottomNavItems();
  const openMenu = useNavDrawer((s) => s.setOpen);
  const activePath = activeNavPath(pathname, items);
  const needsMenu = items.length < BOTTOM_NAV_MIN;
  const columns = items.length + (needsMenu ? 1 : 0);

  return (
    <nav
      aria-label={brand.direction === 'rtl' ? 'التنقل الرئيسي' : 'Primary'}
      className="frosted-strong fixed inset-x-0 bottom-0 z-[1000] border-t border-border pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg px-1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.path === activePath;
          return (
            <li key={item.path} className="min-w-0">
              <Link
                to={item.path}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-16 touch-manipulation select-none flex-col items-center justify-center gap-1',
                  'transition-[transform,color] duration-fast ease-out active:scale-[0.96]',
                  'focus:outline-none focus-visible:shadow-[inset_var(--brand-focus-ring)]',
                  active ? 'text-accent-ink' : 'text-fg-muted hover:text-fg'
                )}
              >
                <span className="relative flex h-8 w-14 items-center justify-center">
                  <span
                    aria-hidden
                    className={cn(
                      'absolute inset-0 rounded-full bg-accent-soft transition-[transform,opacity] duration-base ease-out',
                      active ? 'scale-100 opacity-100' : 'scale-x-50 scale-y-75 opacity-0'
                    )}
                  />
                  <Icon sx={{ fontSize: 24 }} className="relative" />
                  {badges?.[item.path] && (
                    <span aria-hidden className="absolute end-3 top-1 size-2 rounded-full bg-danger ring-2 ring-[color:var(--surface-panel)]" />
                  )}
                </span>
                <span className={cn('max-w-full truncate px-0.5 text-2xs leading-none', active ? 'font-semibold' : 'font-medium')}>
                  {navLabel(item, brand.direction)}
                </span>
              </Link>
            </li>
          );
        })}
        {needsMenu && (
          <li className="min-w-0">
            <button
              type="button"
              onClick={() => openMenu(true)}
              className={cn(
                'flex h-16 w-full touch-manipulation select-none flex-col items-center justify-center gap-1 text-fg-muted',
                'transition-[transform,color] duration-fast ease-out hover:text-fg active:scale-[0.96]',
                'focus:outline-none focus-visible:shadow-[inset_var(--brand-focus-ring)]'
              )}
            >
              <span className="flex h-8 w-14 items-center justify-center">
                <MenuIcon sx={{ fontSize: 24 }} />
              </span>
              <span className="max-w-full truncate px-0.5 text-2xs font-medium leading-none">
                {brand.direction === 'rtl' ? 'القائمة' : 'Menu'}
              </span>
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
}
