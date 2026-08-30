import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/lib/theme';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { LoadingSpinner } from '@/components/common/loading-state';
import { AdminLayout } from './components/AdminLayout';
import { getUserRole } from '@/lib/api';
import { homePath } from '@/lib/roles';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const PromptsPage = lazy(() => import('./pages/PromptsPage'));
const ForbiddenPage = lazy(() => import('./pages/ForbiddenPage'));
const SkillCatalogPage = lazy(() => import('./pages/SkillCatalogPage'));
const JobPostingsPage = lazy(() => import('./pages/JobPostingsPage'));
const CompaniesPage = lazy(() => import('./pages/CompaniesPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const AiLogsPage = lazy(() => import('./pages/AiLogsPage'));
const DeployCiSettingsPage = lazy(() => import('./pages/DeployCiSettingsPage'));
const LlmSettingsPage = lazy(() => import('./pages/LlmSettingsPage'));
const BotLinksPage = lazy(() => import('./pages/BotLinksPage'));

const queryClient = new QueryClient();
const adminBase = (import.meta.env.BASE_URL || '/admin/').replace(/\/$/, '') || '/admin';

function PageFallback() {
  return <LoadingSpinner className="min-h-[50vh]" />;
}

function RequireRoles({ roles }: { roles: string[] }) {
  const role = getUserRole();
  if (!role || !roles.includes(role)) {
    return <Navigate to={homePath(role)} replace />;
  }
  return <Outlet />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TooltipProvider>
          <QueryClientProvider client={queryClient}>
          <Toaster richColors closeButton position="top-right" />
          <BrowserRouter basename={adminBase}>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route element={<AdminLayout />}>
                  <Route element={<RequireRoles roles={['ADMIN', 'JOB_ADMIN']} />}>
                    <Route path="/job-postings" element={<JobPostingsPage />} />
                  </Route>
                  <Route element={<RequireRoles roles={['ADMIN', 'USER_ADMIN']} />}>
                    <Route path="/users" element={<UsersPage />} />
                  </Route>
                  <Route element={<RequireRoles roles={['ADMIN']} />}>
                    <Route path="/prompts" element={<PromptsPage />} />
                    <Route path="/forbidden-expressions" element={<ForbiddenPage />} />
                    <Route path="/skill-catalog" element={<SkillCatalogPage />} />
                    <Route path="/companies" element={<CompaniesPage />} />
                    <Route path="/ai-logs" element={<AiLogsPage />} />
                    <Route path="/llm-settings" element={<LlmSettingsPage />} />
                    <Route path="/bot-links" element={<BotLinksPage />} />
                    <Route path="/deploy-ci-settings" element={<DeployCiSettingsPage />} />
                  </Route>
                </Route>
                <Route path="*" element={<Navigate to={homePath(getUserRole())} replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </QueryClientProvider>
      </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
