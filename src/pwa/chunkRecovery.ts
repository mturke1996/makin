/**
 * A tab opened before a deploy still points at the old hashed files. When one of them is gone the browser
 * cannot load a lazy screen ("Failed to fetch dynamically imported module"): reload once to pick up the new
 * build instead of leaving a broken page. The flag stops a loop if the failure is not about a stale build.
 */
const FLAG = 'pwa-reloaded-after-chunk-error';
const RESET_AFTER_MS = 20_000;

export function installChunkRecovery(): void {
  window.addEventListener('vite:preloadError', (event) => {
    try {
      if (sessionStorage.getItem(FLAG)) return;
      sessionStorage.setItem(FLAG, '1');
    } catch {
      return; // storage blocked: reloading blindly could loop, so leave the error visible
    }
    event.preventDefault();
    window.location.reload();
  });

  // A page that loaded fine for a while may recover again next time.
  window.setTimeout(() => {
    try {
      sessionStorage.removeItem(FLAG);
    } catch {
      /* nothing to reset */
    }
  }, RESET_AFTER_MS);
}
