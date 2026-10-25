import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

/** How often an open app asks the server whether a new version exists. */
export const UPDATE_CHECK_EVERY_MS = 10 * 60 * 1000;

/**
 * Registers the service worker and reports when a newer version is downloaded and waiting.
 *
 * The browser only looks for a new service worker when a page is opened, so an installed app that stays in the
 * background for days never learns about a deploy. This also asks on a timer, whenever the app comes back to the
 * foreground and whenever the connection returns. The new version is never applied behind the person's back (a
 * half-filled form would be lost): `applyUpdate` swaps it in and reloads.
 */
export function usePwaUpdate() {
  const [updateReady, setUpdateReady] = useState(false);
  const updateSW = useRef<((reload?: boolean) => Promise<void>) | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    try {
      updateSW.current = registerSW({
        immediate: true,
        onNeedRefresh() {
          setUpdateReady(true);
        },
        onRegisteredSW(_url, registration) {
          if (!registration) return;
          const check = () => {
            if (!navigator.onLine || registration.installing) return;
            registration.update().catch(() => undefined);
          };
          window.setInterval(check, UPDATE_CHECK_EVERY_MS);
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') check();
          });
          window.addEventListener('online', check);
        },
        onRegisterError(e) {
          if (import.meta.env.DEV) console.warn('[PWA] register error', e);
        },
      });
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[PWA] registerSW failed', e);
    }
  }, []);

  const applyUpdate = useCallback(() => {
    // Activates the waiting worker and reloads the page once it controls it.
    void updateSW.current?.(true);
  }, []);

  return { updateReady, applyUpdate, dismiss: () => setUpdateReady(false) };
}
