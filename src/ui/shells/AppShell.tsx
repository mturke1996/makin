import { Outlet, useLocation } from 'react-router-dom';
import { Suspense, useEffect, useRef } from 'react';
import { Sidebar } from '../nav/Sidebar';
import { TopBar } from '../nav/TopBar';
import { MobileBottomNav } from '../nav/MobileBottomNav';
import { NotificationPanel } from '../notifications/NotificationPanel';
import { SmartAlertsBootstrap } from '../notifications/SmartAlertsBootstrap';
import { InstallBanner } from '../../pwa/InstallUi';
import { PageFallback } from '../feedback/PageFallback';

/**
 * AppShell: authenticated layout.
 *
 *  md+ : side rail (xl+: full sidebar) + content (no top/bottom bars): tablets in both directions, laptops
 *  <md : top bar + content + bottom nav (both frosted, fixed to the edges)
 *
 *  Scroll resets to top on every route change.
 */
export function AppShell() {
  const location = useLocation();

  // From 768px the page area scrolls inside the shell rather than the window, so both go back to the top.
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    // scrollTop, not scrollTo: Element.scrollTo is missing on iPads still on iOS 13.
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [location.pathname]);

  return (
    <div className="app-shell-root">
      <SmartAlertsBootstrap />
      <NotificationPanel />
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TopBar />
        {/*
          Phones: the page scrolls with the window; bottom padding clears the 64px tab bar + home indicator.
          md+: .app-shell-main gets overflow-y auto + min-height 0 so the sidebar/content split scrolls correctly.
        */}
        <main ref={mainRef} className="app-shell-main flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
          {/* The shell stays on screen while a page's code loads: only this block waits. */}
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <MobileBottomNav />
      <InstallBanner />
    </div>
  );
}
