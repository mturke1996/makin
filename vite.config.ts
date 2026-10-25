import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FB_SW_VERSION = '10.7.0';

/**
 * Writes `public/fcm-background.js` for Workbox `importScripts` (FCM onBackground).
 * Enabled when Vite env has Firebase + Web Push VAPID (Firebase Console → Cloud Messaging).
 */
function fcmBackgroundScriptPlugin(): Plugin {
  return {
    name: 'fcm-background-script',
    configResolved(c) {
      const env = loadEnv(c.mode, process.cwd(), 'VITE_');
      const outPath = path.join(__dirname, 'public/fcm-background.js');
      const enable =
        Boolean(env.VITE_FIREBASE_API_KEY) &&
        Boolean(env.VITE_FIREBASE_MESSAGING_SENDER_ID) &&
        Boolean(env.VITE_FIREBASE_VAPID_KEY);
      if (!enable) {
        writeFileSync(
          outPath,
          `// FCM background: set VITE_FIREBASE_* and VITE_FIREBASE_VAPID_KEY in .env to enable system notifications when the app is closed.\nvoid 0;\n`
        );
        return;
      }
      const cfg = {
        apiKey: env.VITE_FIREBASE_API_KEY,
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: env.VITE_FIREBASE_APP_ID,
        measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
      };
      const body = `importScripts('https://www.gstatic.com/firebasejs/${FB_SW_VERSION}/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/${FB_SW_VERSION}/firebase-messaging-compat.js');
if (!firebase.apps.length) { firebase.initializeApp(${JSON.stringify(cfg)}); }
var messaging = firebase.messaging();
messaging.onBackgroundMessage(function (payload) {
  var n = payload.notification || {};
  var title = n.title || 'إشعار';
  var b = n.body || '';
  return self.registration.showNotification(title, { body: b, icon: '/pwa/icon-192.png', badge: '/pwa/badge-96.png', data: payload.data || {} });
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
      for (var i = 0; i < cs.length; i++) { var c = cs[i]; if (c.url && c.focus) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
`;
      writeFileSync(outPath, body.trim() + '\n');
    },
  };
}

/**
 * ============================================================================
 *  Vite config — tuned for mobile PWA + Firebase Cloud Messaging.
 * ============================================================================
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const hasFcmWorkbox =
    Boolean(env.VITE_FIREBASE_API_KEY) &&
    Boolean(env.VITE_FIREBASE_MESSAGING_SENDER_ID) &&
    Boolean(env.VITE_FIREBASE_VAPID_KEY);

  const manifest = JSON.parse(readFileSync(path.join(__dirname, 'public/manifest.json'), 'utf-8')) as Record<
    string,
    unknown
  >;

  return {
    plugins: [
      react(),
      fcmBackgroundScriptPlugin(),
      VitePWA({
        // 'prompt': the new worker waits until the person taps «تحديث الآن» (see src/pwa), so a screen that is
        // already open never loses its lazy files halfway. The app asks for updates itself (usePwaUpdate).
        registerType: 'prompt',
        injectRegister: 'auto',
        includeAssets: [
          'brand/favicon.svg',
          'brand/logo.svg',
          'brand/apple-touch-icon.svg',
          'pwa/icon-192.png',
          'pwa/apple-touch-icon-180.png',
          'pwa/favicon-48.png',
          'fcm-background.js',
        ],
        manifest: {
          ...manifest,
          // White-label: the installed app's name/colour can be set per deployment.
          ...(env.VITE_APP_NAME ? { name: env.VITE_APP_NAME } : {}),
          ...(env.VITE_APP_SHORT_NAME || env.VITE_APP_NAME
            ? { short_name: env.VITE_APP_SHORT_NAME || env.VITE_APP_NAME }
            : {}),
          ...(env.VITE_THEME_COLOR ? { theme_color: env.VITE_THEME_COLOR, background_color: env.VITE_THEME_COLOR } : {}),
        },
        manifestFilename: 'manifest.json',
        workbox: {
          // Precache only what the first screen needs (shell, entry, shared vendors, woff2 fonts). Everything else
          // (each page, the PDF and Excel libraries, the legacy .woff fonts) was ~4.7 MB downloaded up front and again
          // on every deploy; it is now cached the first time it is used (runtimeCaching below).
          globPatterns: [
            'index.html',
            'manifest.json',
            'assets/index-*.{js,css}',
            'assets/vendor-*.js',
            'assets/*.woff2',
            'brand/*.svg',
            'pwa/favicon-48.png',
            'pwa/icon-192.png',
            'pwa/apple-touch-icon-180.png',
          ],
          globIgnores: ['**/vendor-xlsx-*.js'],
          navigateFallback: 'index.html',
          // Only real page navigations get the shell: never a missing script, style or font.
          navigateFallbackDenylist: [/^\/assets\//, /^\/api\//, /\.[a-z0-9]{2,5}$/i],
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              // Hashed files never change under the same name, so serve them from the cache and keep the last 80.
              urlPattern: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
                sameOrigin && url.pathname.startsWith('/assets/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'app-assets',
                expiration: { maxEntries: 80, maxAgeSeconds: 30 * 24 * 60 * 60 },
                cacheableResponse: { statuses: [200] },
              },
            },
          ],
          importScripts: hasFcmWorkbox ? ['/fcm-background.js'] : [],
        },
        devOptions: {
          // Disabled in dev: a dev service worker was serving STALE cached assets,
          // so UI changes never appeared until a full unregister. PWA still works in build.
          enabled: false,
          navigateFallback: 'index.html',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        buffer: 'buffer',
      },
    },
    define: {
      'process.env': {},
      global: 'globalThis',
    },
    optimizeDeps: {
      include: [
        'buffer',
        'base64-js',
        'ieee754',
        '@react-pdf/renderer',
        'firebase/messaging',
      ],
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
    },
    server: {
      port: 3000,
      host: true,
    },
    build: {
      chunkSizeWarningLimit: 900,
      target: 'es2020',
      minify: 'esbuild',
      cssMinify: 'esbuild',
      cssCodeSplit: true,
      sourcemap: false,
      reportCompressedSize: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-router': ['react-router-dom'],
            'vendor-mui': ['@mui/material', '@mui/icons-material'],
            'vendor-firebase': [
              'firebase/app',
              'firebase/auth',
              'firebase/firestore',
              'firebase/messaging',
            ],
            'vendor-state': [
              'zustand',
              'react-hook-form',
              'zod',
              '@hookform/resolvers',
            ],
            // Needed at startup (main.tsx). @react-pdf is deliberately NOT pinned to a manual chunk:
            // as a named vendor chunk it dragged the shared CJS helpers in and got preloaded with the app shell.
            'vendor-polyfills': ['buffer', 'base64-js', 'ieee754'],
            'vendor-xlsx': ['xlsx'],
            'vendor-dayjs': ['dayjs'],
          },
        },
      },
    },
  };
});
