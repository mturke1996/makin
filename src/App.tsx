import { lazy, Suspense, useMemo, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, CircularProgress, Box } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppTheme } from './theme';
import { useThemeStore } from './store/useThemeStore';
import { useAuthStore } from './store/useAuthStore';
import { useDataStore } from './store/useDataStore';
import { ProtectedRoute } from './components/ProtectedRoute';

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })));
const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })));
const ClientsPage = lazy(() => import('./pages/ClientsPage').then(module => ({ default: module.ClientsPage })));
const ClientProfilePage = lazy(() => import('./pages/ClientProfilePage').then(module => ({ default: module.ClientProfilePage })));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage').then(module => ({ default: module.InvoicesPage })));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage').then(module => ({ default: module.PaymentsPage })));
const DebtsPage = lazy(() => import('./pages/DebtsPage').then(module => ({ default: module.DebtsPage })));
const ExpenseInvoicesPage = lazy(() => import('./pages/ExpenseInvoicesPage').then(module => ({ default: module.ExpenseInvoicesPage })));

// Create QueryClient with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Loading component
const LoadingFallback = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
    }}
  >
    <CircularProgress />
  </Box>
);

function App() {
  const themeMode = useThemeStore((state) => state.mode);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { initialized, initializeData, subscribeToRealtimeUpdates } = useDataStore();

  // Memoize theme to prevent unnecessary recalculations
  const theme = useMemo(() => createAppTheme(themeMode), [themeMode]);

  // Initialize data when user is authenticated
  useEffect(() => {
    if (isAuthenticated && !initialized) {
      initializeData();
      
      // Subscribe to real-time updates
      const unsubscribe = subscribeToRealtimeUpdates();
      
      // Cleanup on unmount
      return () => {
        // Cleanup function
      };
    }
  }, [isAuthenticated, initialized, initializeData, subscribeToRealtimeUpdates]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public Routes */}
              <Route
                path="/login"
                element={
                  isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
                }
              />

              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <HomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients"
                element={
                  <ProtectedRoute>
                      <ClientsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients/:clientId"
                element={
                  <ProtectedRoute>
                      <ClientProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices"
                element={
                  <ProtectedRoute>
                      <InvoicesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payments"
                element={
                  <ProtectedRoute>
                      <PaymentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/debts"
                element={
                  <ProtectedRoute>
                      <DebtsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/expense-invoices"
                element={
                  <ProtectedRoute>
                      <ExpenseInvoicesPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
