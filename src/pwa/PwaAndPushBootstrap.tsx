import { useEffect, useRef } from 'react';

import { hasValidFirebase } from '../config/firebase';
import { setupForegroundMessaging } from '../core/push/fcmClient';
import { PwaUpdateBanner } from './PwaUpdateBanner';
import { usePwaUpdate } from './usePwaUpdate';

/**
 * Registers the PWA service worker (workbox), offers a new version when one is ready, and, when the user is
 * signed in, subscribes to FCM **foreground** messages (mirrors into the in-app center).
 * Background + system tray: fcm-background.js (generated when VAPID is set) + FCM from console.
 */
export function PwaAndPushBootstrap({ isAuthenticated }: { isAuthenticated: boolean }) {
  const fcmDone = useRef(false);
  const { updateReady, applyUpdate, dismiss } = usePwaUpdate();

  useEffect(() => {
    if (!isAuthenticated || !hasValidFirebase) return;
    if (fcmDone.current) return;
    fcmDone.current = true;
    void setupForegroundMessaging();
  }, [isAuthenticated]);

  return updateReady ? <PwaUpdateBanner onUpdate={applyUpdate} onDismiss={dismiss} /> : null;
}
