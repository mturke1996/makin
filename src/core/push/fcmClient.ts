import { getApp } from 'firebase/app';
import type { Messaging } from 'firebase/messaging';

import { hasValidFirebase } from '../../config/firebase';
import { useNotificationStore } from '../../stores/useNotificationStore';

const TOKEN_KEY = 'fcm_device_token';
const VAPID_KEY = (import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined) || '';

let messagingInited = false;
let messaging: Messaging | null = null;

/** Messaging is a separate file: it is fetched only when push is actually set up, not with every start. */
const loadMessaging = () => import('firebase/messaging');

async function getOrCreateMessaging(): Promise<Messaging | null> {
  if (!hasValidFirebase) return null;
  const { getMessaging, isSupported } = await loadMessaging();
  if (!(await isSupported())) return null;
  if (messaging) return messaging;
  const app = getApp();
  messaging = getMessaging(app);
  return messaging;
}

/**
 * Listens for FCM while the app is in the foreground; mirrors messages into the in-app center.
 */
export async function setupForegroundMessaging(): Promise<(() => void) | void> {
  if (messagingInited) return;
  const m = await getOrCreateMessaging();
  if (!m) return;
  messagingInited = true;
  const { onMessage } = await loadMessaging();
  return onMessage(m, (payload) => {
    const t = payload.notification?.title || (payload.data?.title as string | undefined) || 'إشعار';
    const b = payload.notification?.body || (payload.data?.body as string | undefined) || undefined;
    useNotificationStore.getState().push({
      type: 'info',
      title: t,
      body: b,
      source: 'push',
      href: typeof payload.data?.href === 'string' ? (payload.data.href as string) : undefined,
    });
  });
}

export function getStoredFcmToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearStoredFcmToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export type PushRegisterResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'no_vapid' | 'no_firebase' | 'unsupported' | 'denied' | 'no_token' | 'error'; message?: string };

/**
 * Subscribes to Web Push (FCM) using the PWA service worker. Requires
 * [Firebase Console] Cloud Messaging → Web Push certificates (VAPID) in VITE_FIREBASE_VAPID_KEY.
 */
export async function requestPushAndRegisterToken(): Promise<PushRegisterResult> {
  if (!VAPID_KEY) return { ok: false, reason: 'no_vapid' };
  if (!hasValidFirebase) return { ok: false, reason: 'no_firebase' };
  if (!(await (await loadMessaging()).isSupported())) return { ok: false, reason: 'unsupported' };
  if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
    return { ok: false, reason: 'unsupported' };
  }

  let perm: NotificationPermission;
  try {
    perm = await Notification.requestPermission();
  } catch (e) {
    return { ok: false, reason: 'error', message: (e as Error).message };
  }
  if (perm !== 'granted') return { ok: false, reason: 'denied' };

  try {
    const reg = await navigator.serviceWorker.ready;
    const m = await getOrCreateMessaging();
    if (!m) return { ok: false, reason: 'error', message: 'messaging' };
    const { getToken } = await loadMessaging();
    const token = await getToken(m, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: reg,
    });
    if (!token) return { ok: false, reason: 'no_token' };
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* ignore */
    }
    return { ok: true, token };
  } catch (e) {
    return { ok: false, reason: 'error', message: (e as Error).message };
  }
}

export function hasVapidConfigured(): boolean {
  return Boolean(VAPID_KEY);
}
