import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowBack, CheckCircle, ErrorOutline, Shield, WarningAmber } from '../../design-system/icons';
import { Button, ListGroup } from '../../design-system/primitives';
import { useBrand } from '../../config/BrandProvider';
import { useAccess } from '../../core/access/useAccess';
import { KIND_LABEL, claimIntact, matchRecords, parseClaim } from '../../core/finance/docVerify';
import { formatCurrencyDisplay, formatDate } from '../../core/utils-formatters';
import { useAuthStore } from '../../stores/useAuthStore';
import { useDataSlice } from '../../stores/useDataStore';
import { LogoMark } from '../brand/LogoMark';

type Tone = 'success' | 'warning' | 'danger';

const TONE: Record<Tone, { box: string; icon: string }> = {
  success: { box: 'border-t-success', icon: 'bg-success-soft text-success-ink' },
  warning: { box: 'border-t-warning', icon: 'bg-warning-soft text-warning-ink' },
  danger: { box: 'border-t-danger', icon: 'bg-danger-soft text-danger-ink' },
};

/**
 * The page a document's QR code opens: /verify?k=…&r=…&a=…&d=…&s=…
 * Anyone can see whether the figures on the link are intact; signed-in staff who may read the records also see
 * whether the company really issued that document for that amount and day.
 */
export function VerifyPage() {
  const brand = useBrand();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const access = useAccess();
  const { payments, expenses, clients, isLoading } = useDataSlice('payments', 'expenses', 'clients', 'isLoading');

  const claim = useMemo(() => parseClaim(params), [params]);
  const intact = claim ? claimIntact(claim) : false;
  // Each kind of document is read from the records that hold it; without the right to read them "not found" means nothing.
  const mayRead = claim ? (claim.kind === 'receipt' ? access.can('payments.view') : access.can('workers.view')) : false;
  const match = useMemo(
    () => (claim && intact && isAuthenticated && mayRead && !isLoading ? matchRecords(claim, { payments, expenses }, (id) => clients.find((c) => c.id === id)?.name ?? '') : null),
    [claim, intact, isAuthenticated, mayRead, isLoading, payments, expenses, clients],
  );

  let tone: Tone = 'warning';
  let title = '';
  let detail = '';
  if (!claim) {
    tone = 'danger';
    title = 'رابط تحقق غير صالح';
    detail = 'الرابط ناقص أو معدَّل. امسح الرمز المطبوع على الوثيقة مباشرة.';
  } else if (!intact) {
    tone = 'danger';
    title = 'الأرقام لا تطابق رمز السلامة';
    detail = 'تغيّر الرقم أو المبلغ أو التاريخ عمّا طُبع أصلاً. لا تعتمد هذه الوثيقة قبل مراجعتها مع الشركة.';
  } else if (match?.status === 'match') {
    tone = 'success';
    title = 'وثيقة صحيحة ومسجّلة';
    detail = 'الرقم والمبلغ والتاريخ مطابقة لما في سجلات الشركة.';
  } else if (match?.status === 'different') {
    tone = 'danger';
    title = 'الوثيقة تخالف السجلات';
    detail = match.differences.map((d) => (d === 'amount' ? `المبلغ في السجل ${formatCurrencyDisplay(match.recorded.amount)}` : `التاريخ في السجل ${formatDate(match.recorded.date)}`)).join(' · ');
  } else if (match?.status === 'not-found') {
    tone = 'danger';
    title = 'لا توجد وثيقة بهذا الرقم';
    detail = 'لم يُعثر على هذا الرقم في سجلات الشركة. ربما حُذفت الدفعة أو لم تصدر هذه الوثيقة عنا.';
  } else if (!isAuthenticated) {
    title = 'الأرقام سليمة، ولم تُطابَق بالسجلات بعد';
    detail = 'ما على الرابط لم يتغيّر منذ الطباعة. للتأكد من أن الشركة أصدرتها فعلاً، يفتحها موظف بحسابه.';
  } else if (!mayRead) {
    title = 'الأرقام سليمة';
    detail = 'حسابك لا يملك صلاحية الاطلاع على سجلات هذه الوثيقة لمطابقتها.';
  } else {
    title = 'جارٍ مطابقة السجلات…';
    detail = '';
  }

  const Icon = tone === 'success' ? CheckCircle : tone === 'danger' ? ErrorOutline : WarningAmber;

  return (
    <div className="min-h-[100dvh] bg-surface-canvas" dir={brand.direction}>
      <header className="pwa-safe-top mx-auto flex max-w-xl items-center px-2 pt-2">
        <Button variant="ghost" leftIcon={<ArrowBack sx={{ fontSize: 20 }} className="rtl-flip" />} onClick={() => navigate(isAuthenticated ? '/' : '/login')}>
          {isAuthenticated ? 'العودة للتطبيق' : 'تسجيل الدخول'}
        </Button>
      </header>

      <main className="mx-auto max-w-xl space-y-6 px-4 pb-[max(32px,env(safe-area-inset-bottom))] pt-4">
        <div className="flex flex-col items-center text-center">
          <LogoMark size={56} />
          <p className="mt-3 text-sm font-semibold text-fg-subtle">التحقق من وثيقة صادرة عن {brand.name}</p>
        </div>

        <section className={`rounded-lg border border-border border-t-4 bg-surface-panel p-5 ${TONE[tone].box}`} aria-live="polite">
          <div className="flex items-start gap-3">
            <span aria-hidden className={`grid size-11 flex-none place-items-center rounded-full ${TONE[tone].icon}`}>
              <Icon sx={{ fontSize: 24 }} />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-snug text-fg">{title}</h1>
              {detail && <p className="mt-1 text-sm leading-relaxed text-fg-subtle">{detail}</p>}
            </div>
          </div>
        </section>

        {claim && (
          <ListGroup>
            <Row label="نوع الوثيقة" value={KIND_LABEL[claim.kind]} />
            <Row label="رقم الوثيقة" value={claim.ref} numeric />
            <Row label="المبلغ" value={formatCurrencyDisplay(Number(claim.amount))} numeric />
            <Row label="التاريخ" value={formatDate(claim.date)} />
            {match?.status === 'match' && match.who && <Row label="العميل / المشروع" value={match.who} />}
          </ListGroup>
        )}

        <section className="flex items-start gap-2.5 rounded-lg bg-surface-sunken p-4 text-sm leading-relaxed text-fg-subtle">
          <Shield sx={{ fontSize: 20 }} aria-hidden className="mt-0.5 flex-none" />
          <p>رمز السلامة يكشف أي تعديل في الأرقام المطبوعة، لكنه لا يغني عن المطابقة مع سجلات الشركة، وهذه لا يراها إلا الموظفون المسجّلون.</p>
        </section>
      </main>
    </div>
  );
}

const Row = ({ label, value, numeric }: { label: string; value: string; numeric?: boolean }) => (
  <div className="flex min-h-12 items-center justify-between gap-3 px-4 py-2.5">
    <span className="text-sm text-fg-subtle">{label}</span>
    <span className={`text-sm font-semibold text-fg ${numeric ? 'tabular-nums' : ''}`} dir={numeric ? 'ltr' : undefined}>{value}</span>
  </div>
);
