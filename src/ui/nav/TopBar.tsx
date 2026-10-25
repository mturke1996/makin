import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowBack, Menu as MenuIcon, Search } from '../../design-system/icons';
import { LogoMark } from '../brand/LogoMark';
import { IconButton } from '../../design-system/primitives';
import { cn } from '../../design-system/primitives/cn';
import { useBrand } from '../../config/BrandProvider';
import { NotificationBell } from '../notifications/NotificationBell';
import { MobileDrawer } from './MobileDrawer';
import { SIDEBAR_NAV, activeNavPath, navLabel } from './navItems';
import { useBottomNavItems } from './useNavAccess';
import { useNavDrawer } from './useNavDrawer';

/** True once the page has scrolled past `threshold` px (with a little hysteresis, one rAF per frame). */
function useScrolledPast(threshold: number): boolean {
  const [past, setPast] = useState(false);
  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      setPast((prev) => (prev ? y > threshold - 12 : y > threshold));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(read);
    };
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [threshold]);
  return past;
}

/**
 * TopBar (phones only): minimal frosted bar.
 *  start: Menu on the main tabs, Back on deeper pages · end: notifications (+ search on home).
 *  The page title lives in each page's PageHeader; it only fades into the bar after ~56px of scroll.
 */
export function TopBar() {
  const brand = useBrand();
  const rtl = brand.direction === 'rtl';
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const drawerOpen = useNavDrawer((s) => s.open);
  const setDrawerOpen = useNavDrawer((s) => s.setOpen);
  const closeDrawer = useCallback(() => setDrawerOpen(false), [setDrawerOpen]);
  const bottomItems = useBottomNavItems();

  const isHome = pathname === '/';
  /** Tab roots are the bottom-bar destinations of THIS person (they differ per permission set). */
  const isTabRoot = isHome || bottomItems.some((item) => item.path === pathname);
  const scrolled = useScrolledPast(56);
  const [pageTitle, setPageTitle] = useState('');

  useEffect(() => {
    if (!scrolled || isHome) return;
    const heading = document.querySelector('main h1')?.textContent?.trim();
    const activePath = activeNavPath(pathname, SIDEBAR_NAV);
    const item = SIDEBAR_NAV.find((n) => n.path === activePath);
    setPageTitle(heading || (item ? navLabel(item, brand.direction) : brand.name));
  }, [scrolled, isHome, pathname, brand.direction, brand.name]);

  return (
    <>
      <header className="frosted-strong pwa-safe-top sticky top-0 z-[100] border-b border-border lg:hidden">
        <div className="flex h-14 items-center gap-1 px-2">
          {isTabRoot ? (
            <IconButton label={rtl ? 'فتح القائمة' : 'Open menu'} onClick={() => setDrawerOpen(true)}>
              <MenuIcon sx={{ fontSize: 24 }} />
            </IconButton>
          ) : (
            <IconButton
              label={rtl ? 'رجوع' : 'Back'}
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
            >
              <ArrowBack sx={{ fontSize: 24 }} className="rtl-flip" />
            </IconButton>
          )}

          <div className="min-w-0 flex-1 px-1 text-start">
            {isHome ? (
              <LogoMark size={28} showName />
            ) : (
              <span
                aria-hidden={!scrolled}
                className={cn(
                  'block truncate text-md font-semibold text-fg',
                  'transition-[opacity,transform] duration-base ease-out',
                  scrolled ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0'
                )}
              >
                {pageTitle}
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center">
            {isHome && (
              <IconButton label={rtl ? 'بحث في العملاء' : 'Search clients'} onClick={() => navigate('/clients')}>
                <Search sx={{ fontSize: 24 }} />
              </IconButton>
            )}
            <NotificationBell size="md" />
          </div>
        </div>
      </header>

      <MobileDrawer open={drawerOpen} onClose={closeDrawer} />
    </>
  );
}
