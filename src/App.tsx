import { useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { BrandProvider, useBrand } from './config/BrandProvider';
import { useBrandStore } from './stores/useBrandStore';
import { useAuthStore } from './stores/useAuthStore';
import { useDataSlice } from './stores/useDataStore';
import { useGlobalFundStore } from './stores/useGlobalFundStore';
import { useNotificationStore } from './stores/useNotificationStore';

// Eager shells + critical paths
import { AppShell } from './ui/shells/AppShell';
import { LoginPage } from './ui/pages/LoginPage';
import { HomePage } from './ui/pages/HomePage';
import { LoadingScreen } from './ui/feedback/LoadingScreen';
import { ErrorBoundary } from './ui/feedback/ErrorBoundary';
import { RequireAccess } from './ui/access/RequireAccess';
import { AccountNotRegistered } from './ui/access/AccountNotRegistered';
import { usePrincipal } from './core/access/useAccess';
import { planSignature } from './core/access/dataPlan';
import { retireLegacyAppLock } from './services/legacyAccess';
import { PwaAndPushBootstrap } from './pwa/PwaAndPushBootstrap';
import { InstallGuideModal } from './pwa/InstallUi';

// Lazy: settings + feature pages (code-split; only loaded when visited)
const BrandingSettingsPage   = lazy(() => import('./ui/pages/BrandingSettingsPage').then(m => ({ default: m.BrandingSettingsPage })));
const ClientsPage            = lazy(() => import('./ui/pages-legacy/ClientsPage').then(m => ({ default: m.ClientsPage })));
const ClientProfilePage      = lazy(() => import('./ui/pages-legacy/ClientProfilePage').then(m => ({ default: m.ClientProfilePage })));
const InvoicesPage           = lazy(() => import('./ui/pages-legacy/InvoicesPage').then(m => ({ default: m.InvoicesPage })));
const NewInvoicePage         = lazy(() => import('./ui/pages-legacy/NewInvoicePage').then(m => ({ default: m.NewInvoicePage })));
const InvoiceDetailsPage     = lazy(() => import('./ui/pages-legacy/InvoiceDetailsPage').then(m => ({ default: m.InvoiceDetailsPage })));
const ExpensesPage           = lazy(() => import('./ui/pages-legacy/ExpensesPage').then(m => ({ default: m.ExpensesPage })));
const ExpenseInvoicesPage    = lazy(() => import('./ui/pages-legacy/ExpenseInvoicesPage').then(m => ({ default: m.ExpenseInvoicesPage })));
const PaymentsPage           = lazy(() => import('./ui/pages-legacy/PaymentsPage').then(m => ({ default: m.PaymentsPage })));
const DebtsPage              = lazy(() => import('./ui/pages-legacy/DebtsPage').then(m => ({ default: m.DebtsPage })));
const UsersPage              = lazy(() => import('./ui/pages-legacy/UsersPage').then(m => ({ default: m.UsersPage })));
const FundPage               = lazy(() => import('./ui/pages-legacy/FundPage').then(m => ({ default: m.FundPage })));
const LettersPage            = lazy(() => import('./ui/pages-legacy/LettersPage').then(m => ({ default: m.LettersPage })));
const AuditLogPage           = lazy(() => import('./ui/pages/AuditLogPage').then(m => ({ default: m.AuditLogPage })));
const InstallPage            = lazy(() => import('./ui/pages/InstallPage').then(m => ({ default: m.InstallPage })));
const BackupPage             = lazy(() => import('./ui/pages/BackupPage').then(m => ({ default: m.BackupPage })));
const ReceivablesPage        = lazy(() => import('./ui/pages/ReceivablesPage').then(m => ({ default: m.ReceivablesPage })));
const WorkersPage            = lazy(() => import('./ui/pages/WorkersPage').then(m => ({ default: m.WorkersPage })));

/**
 * The screens people open most, fetched one after another once the app is idle, so the first tap on them finds
 * the code already here. Skipped on a metered or very slow connection.
 */
const PREFETCH_PAGES: Array<() => Promise<unknown>> = [
  () => import('./ui/pages-legacy/ClientProfilePage'),
  () => import('./ui/pages-legacy/ClientsPage'),
  () => import('./ui/pages-legacy/ExpensesPage'),
  () => import('./ui/pages-legacy/PaymentsPage'),
];

function usePrefetchPages(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? '')) return;
    let cancelled = false;
    const idle = (run: () => void) =>
      typeof requestIdleCallback === 'function' ? requestIdleCallback(run, { timeout: 4000 }) : window.setTimeout(run, 2000);
    const next = (i: number) => {
      if (cancelled || i >= PREFETCH_PAGES.length) return;
      idle(() => {
        if (cancelled) return;
        PREFETCH_PAGES[i]().catch(() => undefined).finally(() => next(i + 1));
      });
    };
    next(0);
    return () => {
      cancelled = true;
    };
  }, [enabled]);
}


function AppRouterBody({ isAuthenticated }: { isAuthenticated: boolean }) {
  const brand = useBrand();
  return (
    <ErrorBoundary rtl={brand.direction === 'rtl'}>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route
            path="/login"
            element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />}
          />
          {/* صفحة عامة لتثبيت التطبيق — تُشارك مع الموظفين (تعمل قبل تسجيل الدخول) */}
          <Route path="/install" element={<InstallPage />} />

          <Route element={isAuthenticated ? <AppShell /> : <Navigate to="/login" replace />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/settings/branding" element={<RequireAccess admin><BrandingSettingsPage /></RequireAccess>} />
            <Route path="/settings/backup" element={<RequireAccess admin><BackupPage /></RequireAccess>} />
            <Route path="/settings/audit" element={<RequireAccess admin><AuditLogPage /></RequireAccess>} />

            <Route path="/clients" element={<RequireAccess module="clients"><ClientsPage /></RequireAccess>} />
            <Route path="/workers" element={<RequireAccess module="workers"><WorkersPage /></RequireAccess>} />
            <Route path="/clients/:id" element={<RequireAccess module="clients"><ClientProfilePage /></RequireAccess>} />

            <Route path="/invoices" element={<RequireAccess module="invoices"><InvoicesPage /></RequireAccess>} />
            <Route path="/invoices/new" element={<RequireAccess anyOf={['invoices.manage']}><NewInvoicePage /></RequireAccess>} />
            <Route path="/invoices/:id" element={<RequireAccess module="invoices"><InvoiceDetailsPage /></RequireAccess>} />

            <Route path="/expenses" element={<RequireAccess module="expenses"><ExpensesPage /></RequireAccess>} />
            <Route path="/expenses/invoices" element={<RequireAccess anyOf={['expenses.view.all']}><ExpenseInvoicesPage /></RequireAccess>} />
            <Route path="/payments" element={<RequireAccess module="payments"><PaymentsPage /></RequireAccess>} />
            <Route path="/receivables" element={<RequireAccess module="payments"><ReceivablesPage /></RequireAccess>} />
            <Route path="/debts" element={<RequireAccess module="debts"><DebtsPage /></RequireAccess>} />
            <Route path="/users" element={<RequireAccess admin><UsersPage /></RequireAccess>} />
            <Route path="/fund" element={<RequireAccess module="balances"><FundPage /></RequireAccess>} />
            <Route path="/letters" element={<RequireAccess module="letters"><LettersPage /></RequireAccess>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

function AppContent() {
  const { checkAuth, isAuthenticated, isLoading, profileMissing } = useAuthStore();
  const { initialize } = useDataSlice('initialize');
  const principal = usePrincipal();
  // Resubscribe only when what this person may download actually changes.
  const planKey = planSignature(principal);
  usePrefetchPages(isAuthenticated && !profileMissing);

  useEffect(() => {
    const unsub = checkAuth();
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [checkAuth]);

  useEffect(() => {
    if (!isAuthenticated || profileMissing) return;
    const unsubscribeData = initialize(principal);
    const unsubscribeGlobalFund = useGlobalFundStore.getState().initialize(principal);
    return () => {
      unsubscribeData?.();
      unsubscribeGlobalFund?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `planKey` is the signature of `principal`
  }, [isAuthenticated, profileMissing, planKey, initialize]);

  // Alerts quote names and amounts. When what this person may see changes, the old ones must not linger.
  const previousPlan = useRef(planKey);
  useEffect(() => {
    if (previousPlan.current !== planKey) {
      previousPlan.current = planKey;
      useNotificationStore.getState().clear();
    }
  }, [planKey]);

  // One-time cleanup of the retired PIN lock: only an admin may delete its settings document.
  const adminId = principal?.role === 'admin' ? principal.id : null;
  useEffect(() => {
    if (adminId && !profileMissing) void retireLegacyAppLock();
  }, [adminId, profileMissing]);

  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated && profileMissing) return <AccountNotRegistered />;

  return (
    <>
      <div className="flex min-h-[100dvh] flex-1 flex-col">
      <Toaster
        position="top-center"
        gutter={8}
        toastOptions={{
          duration: 3000,
          style: {
            fontSize: '0.8125rem',
            fontWeight: 600,
            borderRadius: '4px',
            padding: '10px 14px',
            boxShadow: 'var(--shadow-lg)',
            background: 'var(--surface-panel)',
            color: 'var(--text-primary)',
            border: '1px solid var(--surface-border)',
            maxWidth: '90vw',
          },
          success: {
            iconTheme: { primary: 'var(--brand-success)' as any, secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: 'var(--brand-danger)' as any, secondary: '#fff' },
          },
        }}
      />

      <BrowserRouter>
        <PwaAndPushBootstrap isAuthenticated={isAuthenticated} />
        <AppRouterBody isAuthenticated={isAuthenticated} />
        <InstallGuideModal />
      </BrowserRouter>
      </div>
    </>
  );
}

export default function App() {
  useBrandStore.getState();
  return (
    <BrandProvider>
      <AppContent />
    </BrandProvider>
  );
}
