import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowBack, GetApp } from '../../design-system/icons';
import { useBrand } from '../../config/BrandProvider';
import { useAuthStore } from '../../stores/useAuthStore';
import { LogoMark } from '../brand/LogoMark';
import { Button, ListGroup, ListRow, Section, Segmented } from '../../design-system/primitives';
import { useInstallStore, type InstallPlatform } from '../../pwa/installPrompt';
import { INSTALL_BENEFITS, InstallShare, InstallSteps, InstalledNotice } from '../../pwa/InstallUi';

const PLATFORMS: { value: InstallPlatform; label: string }[] = [
  { value: 'android', label: 'أندرويد' },
  { value: 'ios', label: 'آيفون' },
  { value: 'desktop', label: 'كمبيوتر' },
];

/**
 * صفحة «تحميل التطبيق» العامة: /install
 * تُرسل للموظفين: زر تثبيت بضغطة واحدة على أندرويد، وخطوات واضحة لكل جهاز، ورمز QR للمشاركة.
 */
export function InstallPage() {
  const brand = useBrand();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { env, deferredPrompt, install, standalone, installed } = useInstallStore();
  const done = standalone || installed;
  const [platform, setPlatform] = useState<InstallPlatform>(env.platform);

  // Steps follow the chosen device; in-app-browser and Samsung hints only apply to the device we detected.
  const stepsEnv = platform === env.platform ? env : { ...env, platform, inAppBrowser: false, samsung: false, firefox: false };

  return (
    <div className="min-h-[100dvh] bg-surface-canvas" dir={brand.direction}>
      <header className="pwa-safe-top mx-auto flex max-w-xl items-center px-2 pt-2">
        <Button
          variant="ghost"
          leftIcon={<ArrowBack sx={{ fontSize: 20 }} className="rtl-flip" />}
          onClick={() => navigate(isAuthenticated ? '/' : '/login')}
        >
          {isAuthenticated ? 'العودة للتطبيق' : 'تسجيل الدخول'}
        </Button>
      </header>

      <main className="mx-auto max-w-xl space-y-8 px-4 pb-[max(32px,env(safe-area-inset-bottom))] pt-4">
        <div className="flex flex-col items-center text-center">
          <LogoMark size={64} />
          <h1 className="mt-5 text-2xl font-bold leading-tight text-fg">ثبّت {brand.name} على هاتفك</h1>
          <p className="mt-2 max-w-sm text-base leading-relaxed text-fg-subtle">
            يفتح من الشاشة الرئيسية بملء الشاشة، ويعمل حتى مع ضعف الإنترنت. بدون متجر تطبيقات.
          </p>

          <div className="mt-6 w-full max-w-sm">
            {done ? (
              <InstalledNotice className="justify-center" />
            ) : (
              deferredPrompt && (
                <Button size="lg" block leftIcon={<GetApp sx={{ fontSize: 22 }} />} onClick={() => void install()}>
                  تثبيت التطبيق الآن
                </Button>
              )
            )}
          </div>
        </div>

        {!done && (
          <section className="space-y-4">
            <Segmented<InstallPlatform> options={PLATFORMS} value={platform} onChange={setPlatform} aria-label="نوع الجهاز" />
            <InstallSteps env={stepsEnv} />
          </section>
        )}

        <Section title="ماذا ستحصل عليه">
          <ListGroup>
            {INSTALL_BENEFITS.map(({ Icon, title, text }) => (
              <ListRow
                key={title}
                density="compact"
                leading={
                  <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
                    <Icon sx={{ fontSize: 22 }} />
                  </span>
                }
                title={title}
                subtitle={<span className="block whitespace-normal">{text}</span>}
              />
            ))}
          </ListGroup>
        </Section>

        <section className="border-t border-border pt-6">
          <InstallShare
            title="شارك التطبيق مع فريقك"
            description="امسح الرمز بكاميرا الجوال، أو أرسل الرابط عبر واتساب. يفتح هذه الصفحة ويثبّت التطبيق بضغطة."
            qrSize={144}
          />
        </section>

        <p className="text-center text-2xs text-fg-muted">
          © {new Date().getFullYear()} {brand.fullName}
        </p>
      </main>
    </div>
  );
}
