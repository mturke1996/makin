// ═════════════════════════════════════════════════════════════════════════
// Browser polyfills — MUST run before any @react-pdf/renderer or buffer
// dependency is evaluated. Keep at the very top.
// ═════════════════════════════════════════════════════════════════════════
import { Buffer } from 'buffer';
(globalThis as any).Buffer = Buffer;
(globalThis as any).global = globalThis;
if (typeof (globalThis as any).process === 'undefined') {
  (globalThis as any).process = { env: {}, version: '', platform: 'browser' };
}

import './bootstrap-purge';
// Capture `beforeinstallprompt` before React mounts (it can fire very early).
import './pwa/installPrompt';
import { installChunkRecovery } from './pwa/chunkRecovery';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// Self-hosted UI font: Cairo, one variable file per script (Arabic ~30 KB, Latin ~34 KB) — no CDN, works offline.
import '@fontsource-variable/cairo/index.css';
import './index.css';

installChunkRecovery();

if (import.meta.env.DEV) {
  window.addEventListener('unhandledrejection', (e) => {
    console.warn('[unhandledrejection]', e.reason);
  });

  // One-time cleanup: remove any stale dev service worker + caches so live edits show.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
    if (typeof caches !== 'undefined') {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
