import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

/** How often an open app asks the server whether a new version exists. */
export const UPDATE_CHECK_EVERY_MS = 10 * 60 * 1000;

/** An update that is ready this soon after the app opened is applied at once: nothing has been typed yet. */
export const AUTO_APPLY_LAUNCH_WINDOW_MS = 20 * 1000;
/** An app that was in the background this long and comes back with an update waiting applies it, if nothing is open. */
export const AUTO_APPLY_AFTER_HIDDEN_MS = 30 * 1000;

/**
 * True when swapping versions now cannot lose anything: no form or dialog is open and nobody is typing.
 * (A reload throws away a half-filled form, so this is checked every time.)
 */
export function isQuietMoment(doc: Document = document): boolean {
  if (doc.querySelector('[role="dialog"]')) return false;
  const active = doc.activeElement;
  return !(active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName));
}

/**
 * Registers the service worker and reports when a newer version is downloaded and waiting.
 *
 * The browser only looks for a new service worker when a page is opened, so an installed app that stays in the
 * background for days never learns about a deploy. This also asks on a timer, whenever the app comes back to the
 * foreground and whenever the connection returns. The new version is never applied while something is open or being
 * typed (a half-filled form would be lost); it is applied by itself at a quiet moment (right after the app opens, or
 * when it comes back from the background), and otherwise by the person with `applyUpdate`, which swaps it in and reloads.
 * Without this an installed app could keep running an old, already fixed version for as long as nobody tapped the banner.
 */
export function usePwaUpdate() {
  const [updateReady, setUpdateReady] = useState(false);
  const updateSW = useRef<((reload?: boolean) => Promise<void>) | null>(null);
  const started = useRef(false);
  const openedAt = useRef(Date.now());
  const hiddenAt = useRef<number | null>(null);
  const ready = useRef(false);
  const applied = useRef(false);

  const apply = useCallback(() => {
    if (applied.current) return;
    applied.current = true;
    void updateSW.current?.(true);
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    try {
      updateSW.current = registerSW({
        immediate: true,
        onNeedRefresh() {
          ready.current = true;
          setUpdateReady(true);
          if (Date.now() - openedAt.current < AUTO_APPLY_LAUNCH_WINDOW_MS && isQuietMoment()) apply();
        },
        onRegisteredSW(_url, registration) {
          if (!registration) return;
          const check = () => {
            if (!navigator.onLine || registration.installing) return;
            registration.update().catch(() => undefined);
          };
          window.setInterval(check, UPDATE_CHECK_EVERY_MS);
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
              hiddenAt.current = Date.now();
              return;
            }
            check();
            const away = hiddenAt.current === null ? 0 : Date.now() - hiddenAt.current;
            hiddenAt.current = null;
            if (ready.current && away >= AUTO_APPLY_AFTER_HIDDEN_MS && isQuietMoment()) apply();
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
  }, [apply]);

  const applyUpdate = useCallback(() => {
    // Activates the waiting worker and reloads the page once it controls it.
    applied.current = false;
    apply();
  }, [apply]);

  return { updateReady, applyUpdate, dismiss: () => setUpdateReady(false) };
}
