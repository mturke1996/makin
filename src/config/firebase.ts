import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { useBrandStore } from '../stores/useBrandStore';
import type { FirebaseBrandConfig } from './brand.types';

/**
 * ============================================================================
 *  FIREBASE CONFIG — WHITE-LABEL
 * ============================================================================
 *  Priority order:
 *    1. Vite env vars  (VITE_FIREBASE_API_KEY, ...)  — production deployment
 *    2. Brand store override (live runtime edit via Branding Settings)
 *    3. DEFAULT_BRAND.firebase (placeholder)
 * ============================================================================
 */

function fromEnv(): Partial<FirebaseBrandConfig> {
  const env = import.meta.env as Record<string, string | undefined>;
  return {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
  };
}

function resolveFirebaseConfig(): FirebaseBrandConfig {
  const fromBrand = useBrandStore.getState().brand.firebase;
  const env = fromEnv();
  return {
    apiKey: env.apiKey || fromBrand.apiKey,
    authDomain: env.authDomain || fromBrand.authDomain,
    projectId: env.projectId || fromBrand.projectId,
    storageBucket: env.storageBucket || fromBrand.storageBucket,
    messagingSenderId: env.messagingSenderId || fromBrand.messagingSenderId,
    appId: env.appId || fromBrand.appId,
    measurementId: env.measurementId || fromBrand.measurementId,
  };
}

export const firebaseConfig: FirebaseBrandConfig = resolveFirebaseConfig();

/** True when the app has real credentials (not placeholders). */
export const hasValidFirebase = firebaseConfig.apiKey && firebaseConfig.apiKey !== 'REPLACE_ME';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig as any);

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export default app;
