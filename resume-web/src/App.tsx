import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './lib/theme';
import { ProtectedLayout } from './components/Layout';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import ExperiencesPage from './pages/ExperiencesPage';
import WorkspacePage from './pages/WorkspacePage';
import JobPostingsPage from './pages/JobPostingsPage';
import WritingStylePage from './pages/WritingStylePage';
import SettingsPage from './pages/SettingsPage';
import VersionComparePage from './pages/VersionComparePage';

const queryClient = new QueryClient();

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
        <Routes>
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
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
