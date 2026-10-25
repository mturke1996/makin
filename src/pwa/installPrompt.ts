import { create } from 'zustand';

/**
 * تثبيت التطبيق (PWA) — يلتقط حدث `beforeinstallprompt` مبكراً (قبل تركيب React)
 * كي يظهر زر «تثبيت» الخاص بنا بدل الشريط الافتراضي، ويحدد المنصة لعرض الإرشادات المناسبة.
 * يُستورد هذا الملف في main.tsx قبل أي شيء آخر.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export type InstallPlatform = 'android' | 'ios' | 'desktop';

export type InstallEnv = {
  platform: InstallPlatform;
  /** متصفح داخل تطبيق (فيسبوك، إنستغرام، …) — لا يدعم التثبيت. */
  inAppBrowser: boolean;
  /** Safari على iOS (أو متصفح iOS يدعم «إضافة إلى الشاشة الرئيسية»). */
  iosSafari: boolean;
  samsung: boolean;
  firefox: boolean;
};

function detectEnv(): InstallEnv {
  if (typeof navigator === 'undefined') {
    return { platform: 'desktop', inAppBrowser: false, iosSafari: false, samsung: false, firefox: false };
  }
  const ua = navigator.userAgent || '';
  const ios =
    /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1);
  const android = /android/i.test(ua);
  const inAppBrowser = /FBAN|FBAV|FB_IAB|Instagram|Line\/|Snapchat|TikTok|; wv\)/i.test(ua);
  return {
    platform: ios ? 'ios' : android ? 'android' : 'desktop',
    inAppBrowser,
    iosSafari: ios && !inAppBrowser,
    samsung: /SamsungBrowser/i.test(ua),
    firefox: /Firefox|FxiOS/i.test(ua),
  };
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    window.matchMedia?.('(display-mode: minimal-ui)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

const DISMISS_KEY = 'pwa-install-dismissed-at';
const DISMISS_DAYS = 5;

function readDismissedAt(): number {
  try {
    return Number(localStorage.getItem(DISMISS_KEY)) || 0;
  } catch {
    return 0;
  }
}

type InstallState = {
  env: InstallEnv;
  /** حدث التثبيت المؤجل (Chrome / Edge / Samsung على أندرويد وسطح المكتب). */
  deferredPrompt: BeforeInstallPromptEvent | null;
  standalone: boolean;
  /** ثُبّت التطبيق في هذه الجلسة. */
  installed: boolean;
  dismissedAt: number;
  /** نافذة الإرشادات (تُفتح من أي مكان في التطبيق). */
  guideOpen: boolean;
  openGuide: () => void;
  closeGuide: () => void;
  dismissBanner: () => void;
  /** يعرض نافذة التثبيت الأصلية إن توفرت، وإلا يفتح الإرشادات. */
  install: () => Promise<'accepted' | 'dismissed' | 'guide'>;
};

export const useInstallStore = create<InstallState>((set, get) => ({
  env: detectEnv(),
  deferredPrompt: null,
  standalone: isStandaloneDisplay(),
  installed: false,
  dismissedAt: readDismissedAt(),
  guideOpen: false,
  openGuide: () => set({ guideOpen: true }),
  closeGuide: () => set({ guideOpen: false }),
  dismissBanner: () => {
    const now = Date.now();
    try {
      localStorage.setItem(DISMISS_KEY, String(now));
    } catch {
      /* private mode */
    }
    set({ dismissedAt: now });
  },
  install: async () => {
    const evt = get().deferredPrompt;
    if (!evt) {
      set({ guideOpen: true });
      return 'guide';
    }
    try {
      await evt.prompt();
      const { outcome } = await evt.userChoice;
      // الحدث صالح لمرة واحدة فقط.
      set({ deferredPrompt: null, installed: outcome === 'accepted' });
      return outcome;
    } catch {
      set({ deferredPrompt: null, guideOpen: true });
      return 'guide';
    }
  },
}));

/** هل يمكن اقتراح التثبيت على هذا الجهاز الآن؟ */
export function canSuggestInstall(s: Pick<InstallState, 'standalone' | 'installed' | 'deferredPrompt' | 'env'>): boolean {
  if (s.standalone || s.installed) return false;
  if (s.deferredPrompt) return true;
  // iOS لا يطلق beforeinstallprompt — نعرض الإرشادات يدوياً.
  return s.env.platform === 'ios' || s.env.platform === 'android';
}

export function bannerRecentlyDismissed(dismissedAt: number): boolean {
  return dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // نمنع الشريط الافتراضي ونحتفظ بالحدث لزر «تثبيت» الخاص بالتطبيق.
    e.preventDefault();
    useInstallStore.setState({ deferredPrompt: e as BeforeInstallPromptEvent });
  });
  window.addEventListener('appinstalled', () => {
    useInstallStore.setState({ deferredPrompt: null, installed: true, guideOpen: false });
  });
  const mq = window.matchMedia?.('(display-mode: standalone)');
  mq?.addEventListener?.('change', () => useInstallStore.setState({ standalone: isStandaloneDisplay() }));
}
