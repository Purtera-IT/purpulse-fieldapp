import { Toaster } from "@/components/ui/toaster"
import FieldJobs       from './pages/FieldJobs';
import FieldJobDetail  from './pages/FieldJobDetail';
import AdminDevPanel   from './pages/AdminDevPanel';
import EnvDiagnostic  from './pages/EnvDiagnostic';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import LegacyJobDetailRedirect from '@/components/routing/LegacyJobDetailRedirect';
import { CANONICAL_JOBS_PATH } from '@/utils/fieldRoutes';
import PageNotFound from './pages/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AuthErrorBoundary from '@/components/AuthErrorBoundary';
import ErrorBoundary from '@/components/ErrorBoundary';
import { attachRetryInterceptor } from '@/lib/axiosRetry';
import { initSentry } from '@/lib/sentry';
import TelemetryConsent from '@/components/TelemetryConsent';

// Initialize Sentry for error tracking
initSentry();

const { Pages, Layout } = pagesConfig;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

/** Legacy list/chat/time — technician home is canonical jobs list */
const LEGACY_TAB_REDIRECT = CANONICAL_JOBS_PATH;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required' || authError.type === 'auth_error') {
      // Show unified error boundary with retry option
      return <AuthErrorBoundary />;
    }
    // offline_mode: allow app to continue in read-only state
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Navigate to={CANONICAL_JOBS_PATH} replace />} />

      {/* Canonical technician flow */}
      <Route
        path="/FieldJobs"
        element={
          <LayoutWrapper currentPageName="FieldJobs">
            <FieldJobs />
          </LayoutWrapper>
        }
      />
      <Route
        path="/FieldJobDetail"
        element={
          <LayoutWrapper currentPageName="FieldJobDetail">
            <FieldJobDetail />
          </LayoutWrapper>
        }
      />

      {/* Legacy technician routes → canonical (pages kept on disk, not in pages.config) */}
      <Route path="/Jobs" element={<Navigate to={CANONICAL_JOBS_PATH} replace />} />
      <Route path="/JobDetail" element={<LegacyJobDetailRedirect />} />
      <Route path="/Chat" element={<Navigate to={LEGACY_TAB_REDIRECT} replace />} />
      <Route path="/TimeLog" element={<Navigate to={LEGACY_TAB_REDIRECT} replace />} />

      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/EnvDiagnostic" element={<EnvDiagnostic />} />
      <Route path="/AdminDevPanel"  element={
        <LayoutWrapper currentPageName="AdminDevPanel"><AdminDevPanel /></LayoutWrapper>
      } />

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  // Attach retry interceptor to axios
  if (typeof window !== 'undefined') {
    import('@/api/base44Client').then(({ base44 }) => {
      // Retry interceptor will be attached to the underlying axios instance
    });
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <TelemetryConsent />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App