import { useEffect, useState, type ReactNode } from 'react';
import {
  AddBoxOutlined,
  Bolt,
  CheckCircle,
  ContentCopy,
  GetApp,
  InstallDesktop,
  IosShare,
  MoreVert,
  NotificationsActive,
  OpenInBrowser,
  PhoneAndroid,
  Share,
  WifiOff,
  Menu as MenuIcon,
} from '../design-system/icons';
import toast from 'react-hot-toast';
import { useBrand } from '../config/BrandProvider';
import { LogoMark } from '../ui/brand/LogoMark';
import { Button, IconButton, ListGroup, Sheet } from '../design-system/primitives';
import { cn } from '../design-system/primitives/cn';
import {
  bannerRecentlyDismissed,
  canSuggestInstall,
  useInstallStore,
  type InstallEnv,
} from './installPrompt';

/** رابط صفحة التثبيت العامة (تُشارك مع الموظفين). */
export function installPageUrl(): string {
  if (typeof window === 'undefined') return '/install';
  return `${window.location.origin}/install`;
}

export const INSTALL_BENEFITS: { Icon: typeof Bolt; title: string; text: string }[] = [
  { Icon: PhoneAndroid, title: 'أيقونة على الشاشة الرئيسية', text: 'يفتح بلمسة واحدة وبملء الشاشة مثل أي تطبيق.' },
  { Icon: Bolt, title: 'أسرع وأخف', text: 'حجمه صغير ولا يحتاج متجر تطبيقات.' },
  { Icon: WifiOff, title: 'يعمل مع ضعف الإنترنت', text: 'الواجهة محفوظة على جهازك وتفتح فوراً.' },
  { Icon: NotificationsActive, title: 'تنبيهات فورية', text: 'إشعارات العهد والعجز والمستحقات.' },
];

type Step = { icon: ReactNode; text: ReactNode };

const stepIcon = { fontSize: 20 } as const;

function stepsFor(env: InstallEnv): { title: string; steps: Step[]; note?: ReactNode } {
  if (env.inAppBrowser) {
    return {
      title: 'افتح الرابط في المتصفح أولاً',
      steps: [
        { icon: <MoreVert sx={stepIcon} />, text: 'اضغط زر القائمة (ثلاث نقاط) في أعلى الشاشة' },
        { icon: <OpenInBrowser sx={stepIcon} />, text: <>اختر <b>«فتح في المتصفح»</b> أو <b>«Open in Chrome»</b></> },
        { icon: <GetApp sx={stepIcon} />, text: <>ثم اضغط <b>«تثبيت التطبيق»</b> في هذه الصفحة</> },
      ],
      note: 'المتصفح المدمج داخل فيسبوك أو إنستغرام لا يسمح بتثبيت التطبيقات.',
    };
  }
  if (env.platform === 'ios') {
    return {
      title: 'التثبيت على آيفون وآيباد',
      steps: [
        { icon: <IosShare sx={stepIcon} />, text: <>اضغط زر <b>المشاركة</b> أسفل Safari</> },
        { icon: <AddBoxOutlined sx={stepIcon} />, text: <>مرّر للأسفل واختر <b>«إضافة إلى الشاشة الرئيسية»</b></> },
        { icon: <CheckCircle sx={stepIcon} />, text: <>اضغط <b>«إضافة»</b> وستظهر الأيقونة على شاشتك</> },
      ],
    };
  }
  if (env.platform === 'android') {
    if (env.samsung) {
      return {
        title: 'التثبيت من متصفح سامسونج',
        steps: [
          { icon: <MenuIcon sx={stepIcon} />, text: 'اضغط زر القائمة (ثلاثة خطوط) أسفل الشاشة' },
          { icon: <AddBoxOutlined sx={stepIcon} />, text: <>اختر <b>«إضافة صفحة إلى»</b> ثم <b>«الشاشة الرئيسية»</b></> },
          { icon: <CheckCircle sx={stepIcon} />, text: <>اضغط <b>«إضافة»</b></> },
        ],
      };
    }
    return {
      title: env.firefox ? 'التثبيت من Firefox' : 'التثبيت على أندرويد',
      steps: [
        { icon: <MoreVert sx={stepIcon} />, text: 'اضغط زر القائمة (ثلاث نقاط) أعلى المتصفح' },
        { icon: <GetApp sx={stepIcon} />, text: <>اختر <b>«تثبيت التطبيق»</b> أو <b>«إضافة إلى الشاشة الرئيسية»</b></> },
        { icon: <CheckCircle sx={stepIcon} />, text: <>اضغط <b>«تثبيت»</b> وستجد الأيقونة بين تطبيقاتك</> },
      ],
    };
  }
  return {
    title: 'التثبيت على الكمبيوتر',
    steps: [
      { icon: <InstallDesktop sx={stepIcon} />, text: <>اضغط أيقونة <b>التثبيت</b> في شريط العنوان (Chrome أو Edge)</> },
      { icon: <CheckCircle sx={stepIcon} />, text: <>اضغط <b>«تثبيت»</b> ليفتح التطبيق في نافذة مستقلة</> },
      { icon: <PhoneAndroid sx={stepIcon} />, text: 'للهاتف: امسح رمز QR بكاميرا الجوال وافتحه في Chrome' },
    ],
  };
}

/** Numbered steps on one surface, with hairline rows. */
export function InstallSteps({ env, className }: { env: InstallEnv; className?: string }) {
  const { title, steps, note } = stepsFor(env);
  return (
    <div className={className}>
      <h3 className="mb-3 px-1 text-base font-semibold text-fg">{title}</h3>
      <ListGroup role="list">
        {steps.map((s, i) => (
          <div key={i} role="listitem" className="flex min-h-14 items-center gap-3 px-4 py-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent-ink tabular-nums">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 text-sm leading-relaxed text-fg-subtle [&_b]:font-semibold [&_b]:text-fg">{s.text}</span>
            <span className="shrink-0 text-fg-muted" aria-hidden>
              {s.icon}
            </span>
          </div>
        ))}
      </ListGroup>
      {note && <p className="mt-3 rounded-md bg-warning-soft px-3 py-2 text-xs leading-relaxed text-warning-ink">{note}</p>}
    </div>
  );
}

/** رمز QR لرابط التثبيت، لمسحه من الجوال. */
export function InstallQr({ url, size = 168, className }: { url: string; size?: number; className?: string }) {
  // The QR library is only needed on the install screens, so it is fetched when one of them is drawn, not with the app.
  const [path, setPath] = useState<{ d: string; n: number } | null>(null);
  useEffect(() => {
    let alive = true;
    void import('qrcode-generator')
      .then(({ default: qrcode }) => {
        const qr = qrcode(0, 'M');
        qr.addData(url);
        qr.make();
        const n = qr.getModuleCount();
        let d = '';
        for (let r = 0; r < n; r++) {
          for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
        }
        if (alive) setPath({ d, n });
      })
      .catch(() => {
        if (alive) setPath(null);
      });
    return () => {
      alive = false;
    };
  }, [url]);
  if (!path) return null;
  const pad = 2;
  return (
    <svg
      role="img"
      aria-label="رمز QR لتثبيت التطبيق"
      width={size}
      height={size}
      viewBox={`${-pad} ${-pad} ${path.n + pad * 2} ${path.n + pad * 2}`}
      shapeRendering="crispEdges"
      className={cn('rounded-md bg-white', className)}
    >
      <rect x={-pad} y={-pad} width={path.n + pad * 2} height={path.n + pad * 2} fill="#fff" />
      <path d={path.d} fill="#0f172a" />
    </svg>
  );
}

async function copyInstallLink() {
  try {
    await navigator.clipboard.writeText(installPageUrl());
    toast.success('تم نسخ رابط التثبيت');
  } catch {
    toast.error('تعذّر نسخ الرابط');
  }
}

export async function shareInstallLink(appName: string) {
  const url = installPageUrl();
  const text = `ثبّت تطبيق ${appName} على هاتفك من هذا الرابط:`;
  try {
    if (navigator.share) {
      await navigator.share({ title: appName, text, url });
      return;
    }
  } catch {
    return; // أُلغيت المشاركة
  }
  await copyInstallLink();
}

/** QR + share/copy actions for installing on another phone. */
export function InstallShare({ title, description, qrSize = 112 }: { title: string; description: string; qrSize?: number }) {
  const brand = useBrand();
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <InstallQr url={installPageUrl()} size={qrSize} className="shrink-0 border border-border" />
      <div className="min-w-0 flex-1 text-center sm:text-start">
        <h3 className="text-base font-semibold text-fg">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-fg-subtle">{description}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
          <Button variant="outline" leftIcon={<Share sx={{ fontSize: 18 }} />} onClick={() => void shareInstallLink(brand.name)}>
            مشاركة الرابط
          </Button>
          <Button variant="ghost" leftIcon={<ContentCopy sx={{ fontSize: 18 }} />} onClick={() => void copyInstallLink()}>
            نسخ الرابط
          </Button>
        </div>
      </div>
    </div>
  );
}

export function InstalledNotice({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 rounded-lg bg-success-soft px-4 py-3.5 text-base font-semibold text-success-ink', className)}>
      <CheckCircle sx={{ fontSize: 24 }} />
      التطبيق مثبت على هذا الجهاز
    </div>
  );
}

/** دليل التثبيت: يُفتح من أي مكان عبر useInstallStore().openGuide(). */
export function InstallGuideModal() {
  const brand = useBrand();
  const { guideOpen, closeGuide, env, deferredPrompt, install, standalone, installed } = useInstallStore();
  const done = standalone || installed;

  return (
    <Sheet
      open={guideOpen}
      onClose={closeGuide}
      mobile="bottom"
      maxWidth="sm"
      title={`تثبيت ${brand.name}`}
      subtitle="تطبيق خفيف على جهازك، بدون متجر تطبيقات"
    >
      <div className="space-y-6 p-4 pb-[max(24px,env(safe-area-inset-bottom))] lg:p-6">
        {done ? (
          <InstalledNotice />
        ) : (
          <>
            {deferredPrompt && (
              <Button size="lg" block leftIcon={<GetApp sx={{ fontSize: 22 }} />} onClick={() => void install()}>
                تثبيت الآن
              </Button>
            )}
            <InstallSteps env={env} />
          </>
        )}
        <InstallShare title="ثبّته على جوال آخر" description="امسح الرمز بكاميرا الجوال، أو شارك رابط التثبيت مع فريقك." />
      </div>
    </Sheet>
  );
}

/**
 * شريط «ثبّت التطبيق» على الهاتف بعد الدخول (يعود بعد بضعة أيام من الإغلاق).
 */
export function InstallBanner() {
  const brand = useBrand();
  const state = useInstallStore();
  const [ready, setReady] = useState(false);

  // مهلة قصيرة كي لا يزاحم الشريط تحميل الصفحة الأولى.
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 2500);
    return () => window.clearTimeout(t);
  }, []);

  const eligible =
    ready &&
    canSuggestInstall(state) &&
    state.env.platform !== 'desktop' &&
    !bannerRecentlyDismissed(state.dismissedAt);
  if (!eligible) return null;

  const oneTap = Boolean(state.deferredPrompt);

  return (
    <div
      role="region"
      aria-label="تثبيت التطبيق"
      className="install-banner-in fixed inset-x-3 bottom-[calc(72px+env(safe-area-inset-bottom))] z-[1100] mx-auto max-w-md lg:hidden"
    >
      <div className="rounded-xl border border-border bg-surface-panel p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <LogoMark size={40} />
          <div className="min-w-0">
            <p className="text-base font-semibold leading-snug text-fg">ثبّت {brand.name} على هاتفك</p>
            <p className="mt-0.5 text-xs leading-relaxed text-fg-subtle">يفتح من الشاشة الرئيسية بملء الشاشة، وبدون متجر تطبيقات.</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            className="flex-1"
            leftIcon={oneTap || state.env.platform !== 'ios' ? <GetApp sx={{ fontSize: 20 }} /> : <IosShare sx={{ fontSize: 20 }} />}
            onClick={() => void state.install()}
          >
            {oneTap ? 'تثبيت الآن' : 'طريقة التثبيت'}
          </Button>
          <Button variant="ghost" onClick={state.dismissBanner}>
            لاحقاً
          </Button>
        </div>
      </div>
    </div>
  );
}

/** «تثبيت التطبيق» للقائمة الجانبية (أيقونة) والدرج (صف هادئ). يختفي داخل التطبيق المثبت. */
export function InstallNavButton({
  layout = 'row',
  className,
  onDone,
}: {
  layout?: 'row' | 'icon';
  className?: string;
  onDone?: () => void;
}) {
  const state = useInstallStore();
  if (state.standalone || state.installed) return null;
  const run = () => {
    onDone?.();
    void state.install();
  };

  if (layout === 'icon') {
    return (
      <IconButton size="sm" label="تثبيت التطبيق" onClick={run} className={className}>
        <GetApp sx={{ fontSize: 22 }} />
      </IconButton>
    );
  }

  return (
    <button
      type="button"
      onClick={run}
      className={cn(
        'flex min-h-[52px] w-full items-center gap-3 rounded-md px-3 text-start text-base font-medium text-fg-subtle',
        'transition-colors duration-fast ease-out hover:bg-surface-hover hover:text-fg focus:outline-none focus-visible:shadow-focus',
        className
      )}
    >
      <GetApp sx={{ fontSize: 22 }} className="shrink-0 text-fg-muted" />
      <span className="min-w-0 flex-1">
        <span className="block truncate">تثبيت التطبيق</span>
        <span className="block truncate text-2xs text-fg-muted">{state.deferredPrompt ? 'بضغطة واحدة على جهازك' : 'على الهاتف أو الكمبيوتر'}</span>
      </span>
    </button>
  );
}
