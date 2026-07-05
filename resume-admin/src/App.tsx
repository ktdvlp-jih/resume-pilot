import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminLayout } from './components/AdminLayout';
import LoginPage from './pages/LoginPage';
import PromptsPage from './pages/PromptsPage';
import ForbiddenPage from './pages/ForbiddenPage';
import CompaniesPage from './pages/CompaniesPage';
import UsersPage from './pages/UsersPage';
import AiLogsPage from './pages/AiLogsPage';

const queryClient = new QueryClient();

const adminBase = (import.meta.env.BASE_URL || '/admin/').replace(/\/$/, '') || '/admin';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={adminBase}>
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
      </BrowserRouter>
    </QueryClientProvider>
  );
}
