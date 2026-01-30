import { lazy, Suspense, useMemo, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
  ThemeProvider,
  CssBaseline,
  CircularProgress,
  Box,
} from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { createAppTheme, createModernTheme } from "./theme";
import { useThemeStore } from "./store/useThemeStore";
import { useAuthStore } from "./store/useAuthStore";
import { useDataStore } from "./store/useDataStore";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { MainLayout } from "./components/MainLayout";

// Lazy load pages for code splitting
const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((module) => ({ default: module.LoginPage }))
);
const HomePage = lazy(() =>
  import("./pages/HomePage").then((module) => ({ default: module.HomePage }))
);
const ClientsPage = lazy(() =>
  import("./pages/ClientsPage").then((module) => ({
    default: module.ClientsPage,
  }))
);
const ClientProfilePage = lazy(() =>
  import("./pages/ClientProfilePage").then((module) => ({
    default: module.ClientProfilePage,
  }))
);
const InvoicesPage = lazy(() =>
  import("./pages/InvoicesPage").then((module) => ({
    default: module.InvoicesPage,
  }))
);
const PaymentsPage = lazy(() =>
  import("./pages/PaymentsPage").then((module) => ({
    default: module.PaymentsPage,
  }))
);
const DebtsPage = lazy(() =>
  import("./pages/DebtsPage").then((module) => ({ default: module.DebtsPage }))
);
const ExpenseInvoicesPage = lazy(() =>
  import("./pages/ExpenseInvoicesPage").then((module) => ({
    default: module.ExpenseInvoicesPage,
  }))
);
const MigrationPage = lazy(() => import("./pages/MigrationPage"));
const SettingsPage = lazy(() =>
  import("@/pages/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  }))
);
const BackupPage = lazy(() =>
  import("@/pages/BackupPage").then((module) => ({
    default: module.BackupPage,
  }))
);

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
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
    }}
  >
    <CircularProgress />
  </Box>
);

const HomePageModern = lazy(() =>
  import("./pages/HomePageModern").then((module) => ({ default: module.HomePageModern }))
);

function App() {
  const queryClient = new QueryClient();
  const themeMode = useThemeStore((state) => state.mode);
  const designSystem = useThemeStore((state) => state.designSystem);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { initialized, initializeData, subscribeToRealtimeUpdates } =
    useDataStore();

  // Choose theme
  const theme = useMemo(() => {
    return createAppTheme(themeMode);
  }, [themeMode]);

  // Initialize data when user is authenticated
  useEffect(() => {
    if (isAuthenticated && !initialized) {
      initializeData().then(() => {
        // Subscribe to real-time updates after data is initialized
        subscribeToRealtimeUpdates();
      });
    }

    // Cleanup on unmount or when user logs out
    return () => {
      if (!isAuthenticated) {
        const { unsubscribeFunctions } = useDataStore.getState();
        if (unsubscribeFunctions) {
          unsubscribeFunctions();
          useDataStore.setState({ unsubscribeFunctions: null });
        }
      }
    };
  }, [
    isAuthenticated,
    initialized,
    initializeData,
    subscribeToRealtimeUpdates,
  ]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: themeMode === 'dark' ? '#1e293b' : '#ffffff',
              color: themeMode === 'dark' ? '#f1f5f9' : '#0f172a',
              borderRadius: '12px',
              padding: '16px',
              fontFamily: 'Cairo, sans-serif',
              fontWeight: 600,
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
          }}
        />
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
                    <MainLayout>
                      <HomePageModern />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <ClientsPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients/:clientId"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <ClientProfilePage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <InvoicesPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payments"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <PaymentsPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/debts"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <DebtsPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/expense-invoices"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <ExpenseInvoicesPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/migration"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <MigrationPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <SettingsPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/backup"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <BackupPage />
                    </MainLayout>
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
