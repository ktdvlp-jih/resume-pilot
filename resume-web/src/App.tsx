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
const GuidesPage = lazy(() => import('./pages/public/GuidesPage'));
const GuideArticlePage = lazy(() => import('./pages/public/GuideArticlePage'));
const PublicRoleGuidePage = lazy(() => import('./pages/public/PublicRoleGuidePage'));
const LegalPage = lazy(() => import('./pages/public/LegalPage'));
const CharCountPage = lazy(() => import('./pages/public/CharCountPage'));
const StarToolPage = lazy(() => import('./pages/public/StarToolPage'));
const SpellCheckPage = lazy(() => import('./pages/public/SpellCheckPage'));
const CalendarPage = lazy(() => import('./pages/public/CalendarPage'));
const FeaturesPage = lazy(() => import('./pages/public/FeaturesPage'));
const PricingPage = lazy(() => import('./pages/public/PricingPage'));
const SharedResumePage = lazy(() => import('./pages/public/SharedResumePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ExperiencesPage = lazy(() => import('./pages/ExperiencesPage'));
const ExperienceImportPage = lazy(() => import('./pages/ExperienceImportPage'));
const WorkspacePage = lazy(() => import('./pages/WorkspacePage'));
const JobPostingsPage = lazy(() => import('./pages/JobPostingsPage'));
const RoleGuidePage = lazy(() => import('./pages/RoleGuidePage'));
const WritingStylePage = lazy(() => import('./pages/WritingStylePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const BillingPage = lazy(() => import('./pages/BillingPage'));
const BillingCompletePage = lazy(() => import('./pages/BillingCompletePage'));
const BillingFailPage = lazy(() => import('./pages/BillingFailPage'));
const VersionComparePage = lazy(() => import('./pages/VersionComparePage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const PortfolioPage = lazy(() => import('./pages/PortfolioPage'));

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
                  <Route path="/guides" element={<GuidesPage />} />
                  <Route path="/guides/roles" element={<PublicRoleGuidePage />} />
                  <Route path="/guides/:slug" element={<GuideArticlePage />} />
                  <Route path="/tools/char-count" element={<CharCountPage />} />
                  <Route path="/tools/star" element={<StarToolPage />} />
                  <Route path="/tools/spell" element={<SpellCheckPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/features" element={<FeaturesPage />} />
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route path="/about" element={<LegalPage />} />
                  <Route path="/privacy" element={<LegalPage />} />
                  <Route path="/terms" element={<LegalPage />} />
                  <Route path="/contact" element={<LegalPage />} />
                  <Route path="/r/:token" element={<SharedResumePage />} />
                  <Route element={<ProtectedLayout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/onboarding" element={<OnboardingPage />} />
                    <Route path="/job-postings" element={<JobPostingsPage />} />
                    <Route path="/job-calendar" element={<CalendarPage embedded />} />
                    <Route path="/experiences" element={<ExperiencesPage />} />
                    <Route path="/experiences/import" element={<ExperienceImportPage />} />
                    <Route path="/portfolio" element={<PortfolioPage />} />
                    <Route path="/role-guide" element={<RoleGuidePage />} />
                    <Route path="/writing-style" element={<WritingStylePage />} />
                    <Route path="/workspace" element={<WorkspacePage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/billing" element={<BillingPage />} />
                    <Route path="/billing/complete" element={<BillingCompletePage />} />
                    <Route path="/billing/fail" element={<BillingFailPage />} />
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
