import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorOutline, GetApp, Lock, Mail, Visibility, VisibilityOff } from '../../design-system/icons';
import { useAuthStore } from '../../stores/useAuthStore';
import { useBrand } from '../../config/BrandProvider';
import { hasValidFirebase } from '../../config/firebase';
import { LogoMark } from '../brand/LogoMark';
import { isStandaloneDisplay } from '../../pwa/installPrompt';
import { Button, IconButton, Input } from '../../design-system/primitives';

const WRONG_CREDENTIALS_AR = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';

/**
 * Sign in. One column, brand mark on top, two large fields, one filled button.
 * The column centers when there is room and simply scrolls when the keyboard is open.
 */
export function LoginPage({ authError }: { authError?: string | null }) {
  const brand = useBrand();
  const rtl = brand.direction === 'rtl';
  const t = (ar: string, en: string) => (rtl ? ar : en);
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const storeError = useAuthStore.getState().error;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(authError || storeError || null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  /** Wrong credentials mark both fields; network or server errors do not. */
  const [credentialsWrong, setCredentialsWrong] = useState(storeError === WRONG_CREDENTIALS_AR);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Back here after a rejected password: the email is kept, so the password is the next thing to type.
  useEffect(() => {
    if (credentialsWrong) passwordRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Typing is the fix: drop that field's message and the red state as soon as the user edits. */
  const clearFieldFeedback = (field: 'email' | 'password') => {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    if (credentialsWrong) setCredentialsWrong(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nextFieldErrors = {
      email: email.trim() ? undefined : t('أدخل البريد الإلكتروني', 'Enter your email'),
      password: password ? undefined : t('أدخل كلمة المرور', 'Enter your password'),
    };
    setFieldErrors(nextFieldErrors);
    setError(null);
    setCredentialsWrong(false);
    if (nextFieldErrors.email || nextFieldErrors.password) {
      (nextFieldErrors.email ? emailRef : passwordRef).current?.focus();
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err: any) {
      const msg: string = err?.message || '';
      const code: string = err?.code || '';
      const wrong =
        msg.includes('invalid-credential') || msg.includes('wrong-password') || code === 'auth/invalid-credential';
      setCredentialsWrong(wrong);
      setError(
        rtl
          ? wrong
            ? WRONG_CREDENTIALS_AR
            : code === 'auth/too-many-requests'
              ? 'محاولات كثيرة خاطئة. حاول لاحقاً'
              : code === 'auth/network-request-failed'
                ? 'تعذر الاتصال بالشبكة. تحقق من الإنترنت'
                : 'تعذر تسجيل الدخول. تحقق من البيانات'
          : msg || 'Unable to sign in. Please check your credentials.'
      );
      if (wrong) passwordRef.current?.select();
    } finally {
      setLoading(false);
    }
  };

  const phones = [brand.contact.phone, brand.contact.phoneSecondary].filter(Boolean);

  return (
    <div className="min-h-[100dvh] bg-surface-canvas">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:px-6">
        {/* my-auto: centered when tall enough, top-aligned and scrollable when the keyboard shrinks the viewport */}
        <main className="my-auto w-full py-6">
          <header className="flex flex-col items-center text-center">
            <LogoMark size={64} />
            <p className="mt-3 text-lg font-bold text-fg">{brand.name}</p>
            {brand.features?.showTagline && brand.tagline && (
              <p className="mt-1 text-sm text-fg-subtle">{brand.tagline}</p>
            )}
          </header>

          <div className="mt-8 sm:rounded-xl sm:border sm:border-border sm:bg-surface-panel sm:p-8">
            <h1 className="text-2xl font-bold text-fg">{t('تسجيل الدخول', 'Sign in')}</h1>
            <p className="mt-1 text-sm text-fg-subtle">
              {t('أدخل بريدك وكلمة المرور للمتابعة.', 'Enter your email and password to continue.')}
            </p>

            <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
              <Input
                ref={emailRef}
                fieldSize="lg"
                label={t('البريد الإلكتروني', 'Email')}
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                placeholder="name@company.com"
                dir="ltr"
                className="text-end"
                leftIcon={<Mail sx={{ fontSize: 20 }} />}
                value={email}
                invalid={credentialsWrong}
                error={fieldErrors.email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldFeedback('email');
                }}
              />
              <Input
                ref={passwordRef}
                fieldSize="lg"
                label={t('كلمة المرور', 'Password')}
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                dir="ltr"
                className="text-end"
                leftIcon={<Lock sx={{ fontSize: 20 }} />}
                rightIcon={
                  <IconButton
                    size="md"
                    label={showPw ? t('إخفاء كلمة المرور', 'Hide password') : t('إظهار كلمة المرور', 'Show password')}
                    aria-pressed={showPw}
                    onClick={() => setShowPw((v) => !v)}
                    className="-me-2"
                  >
                    {showPw ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}
                  </IconButton>
                }
                value={password}
                invalid={credentialsWrong}
                error={fieldErrors.password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldFeedback('password');
                }}
              />

              {!hasValidFirebase && (
                <div role="status" className="rounded-md bg-warning-soft px-3.5 py-3 text-sm font-medium text-warning-ink">
                  {rtl ? (
                    <>
                      لم يتم ربط Firebase بعد. أضف مفاتيح <bdi dir="ltr">VITE_FIREBASE_*</bdi> في ملف{' '}
                      <bdi dir="ltr">.env.local</bdi> ثم أعد تشغيل التطبيق.
                    </>
                  ) : (
                    'Firebase is not connected yet. Add the VITE_FIREBASE_* keys to .env.local and restart.'
                  )}
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-md bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger-ink"
                >
                  <ErrorOutline sx={{ fontSize: 20 }} className="mt-px flex-none" aria-hidden />
                  <span className="min-w-0 flex-1 leading-snug">{error}</span>
                </div>
              )}

              <Button type="submit" size="lg" block loading={loading} className="mt-1">
                {loading ? t('جارٍ الدخول', 'Signing in') : t('دخول', 'Sign in')}
              </Button>
            </form>
          </div>

          {!isStandaloneDisplay() && (
            <div className="mt-4 flex justify-center">
              <Button variant="ghost" leftIcon={<GetApp sx={{ fontSize: 20 }} />} onClick={() => navigate('/install')}>
                {t('حمّل التطبيق على هاتفك', 'Install the app')}
              </Button>
            </div>
          )}
        </main>

        <footer className="space-y-1 text-center text-2xs text-fg-muted">
          <p>
            © {new Date().getFullYear()} {brand.fullName}
          </p>
          {phones.length > 0 && (
            <p className="tabular-nums" dir="ltr">
              {phones.join(' · ')}
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}
