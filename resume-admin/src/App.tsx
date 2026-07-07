import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { LoadingSpinner } from '@/components/common/loading-state';
import { AdminLayout } from './components/AdminLayout';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const PromptsPage = lazy(() => import('./pages/PromptsPage'));
const ForbiddenPage = lazy(() => import('./pages/ForbiddenPage'));
const CompaniesPage = lazy(() => import('./pages/CompaniesPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const AiLogsPage = lazy(() => import('./pages/AiLogsPage'));

const queryClient = new QueryClient();
const adminBase = (import.meta.env.BASE_URL || '/admin/').replace(/\/$/, '') || '/admin';

function PageFallback() {
  return <LoadingSpinner className="min-h-[50vh]" />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter basename={adminBase}>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route element={<AdminLayout />}>
                  <Route path="/prompts" element={<PromptsPage />} />
                  <Route path="/forbidden-expressions" element={<ForbiddenPage />} />
                  <Route path="/companies" element={<CompaniesPage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/ai-logs" element={<AiLogsPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/prompts" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </QueryClientProvider>
      </TooltipProvider>
    </ErrorBoundary>
  );
}
