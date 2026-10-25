import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorOutline } from '../../design-system/icons';
import { Button } from '../../design-system/primitives';

interface Props {
  children: ReactNode;
  /** Arabic (default) or English copy. */
  rtl?: boolean;
}

interface State {
  hasError: boolean;
  message: string | null;
}

/**
 * Catches render errors in the child tree and shows a recovery screen instead of a blank page.
 * Both actions do a full navigation, so a stale or failed chunk is fetched again.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const rtl = this.props.rtl ?? true;
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-surface-canvas px-6 py-12" role="alert">
        <div className="flex w-full max-w-sm flex-col items-center text-center">
          <span className="mb-5 flex size-16 items-center justify-center rounded-full bg-danger-soft text-danger-ink">
            <ErrorOutline sx={{ fontSize: 32 }} />
          </span>
          <h1 className="text-xl font-bold text-fg">{rtl ? 'تعذّر عرض هذه الشاشة' : 'This screen could not load'}</h1>
          <p className="mt-2 text-base leading-relaxed text-fg-subtle">
            {rtl
              ? 'حدث خطأ غير متوقع أثناء العرض. بياناتك محفوظة، جرّب مرة أخرى.'
              : 'Something unexpected went wrong. Your data is safe, please try again.'}
          </p>
          {this.state.message && import.meta.env.DEV && (
            <pre dir="ltr" className="mt-4 max-h-24 w-full overflow-auto rounded-md bg-surface-sunken p-3 text-start text-2xs text-fg-muted">
              {this.state.message}
            </pre>
          )}
          <div className="mt-6 flex w-full flex-col gap-2">
            <Button size="lg" block onClick={() => window.location.reload()}>
              {rtl ? 'إعادة المحاولة' : 'Try again'}
            </Button>
            <Button variant="ghost" block onClick={() => window.location.assign('/')}>
              {rtl ? 'العودة للرئيسية' : 'Back to home'}
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
