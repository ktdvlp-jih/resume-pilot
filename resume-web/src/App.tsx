import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './lib/theme';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { LoadingSpinner } from '@/components/common/loading-state';
import { ProtectedLayout } from './components/Layout';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ExperiencesPage = lazy(() => import('./pages/ExperiencesPage'));
const WorkspacePage = lazy(() => import('./pages/WorkspacePage'));
const JobPostingsPage = lazy(() => import('./pages/JobPostingsPage'));
const WritingStylePage = lazy(() => import('./pages/WritingStylePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const VersionComparePage = lazy(() => import('./pages/VersionComparePage'));

const queryClient = new QueryClient();

function PageFallback() {
  return <LoadingSpinner className="min-h-[50vh]" />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TooltipProvider>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route element={<ProtectedLayout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/job-postings" element={<JobPostingsPage />} />
                    <Route path="/experiences" element={<ExperiencesPage />} />
                    <Route path="/writing-style" element={<WritingStylePage />} />
                    <Route path="/workspace" element={<WorkspacePage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/resumes/:id/versions" element={<VersionComparePage />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </QueryClientProvider>
          <Toaster richColors closeButton position="top-right" />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
