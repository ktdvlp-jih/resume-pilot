import { Link, Navigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clearTokens, getAccessToken } from '../lib/api';
import { useTheme } from '../lib/theme';
import { LanguageSwitcher } from './LanguageSwitcher';

export function ProtectedLayout() {
  const { theme, toggle } = useTheme();
  const { t } = useTranslation();
  if (!getAccessToken()) {
    return <Navigate to="/login" replace />;
  }
  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      <aside className="w-56 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-4 flex flex-col">
        <h1 className="text-xl font-bold text-blue-600 mb-4">ResumePilot</h1>
        <LanguageSwitcher className="mb-4 w-full" />
        <nav className="space-y-2 flex-1">
          <NavItem to="/dashboard">{t('nav.dashboard')}</NavItem>
          <NavItem to="/job-postings">{t('nav.jobPostings')}</NavItem>
          <NavItem to="/experiences">{t('nav.experiences')}</NavItem>
          <NavItem to="/writing-style">{t('nav.writingStyle')}</NavItem>
          <NavItem to="/workspace">{t('nav.workspace')}</NavItem>
          <NavItem to="/settings">{t('nav.settings')}</NavItem>
        </nav>
        <button onClick={toggle} className="text-sm text-gray-500 hover:text-blue-600 mb-2">
          {theme === 'dark' ? `☀️ ${t('nav.lightMode')}` : `🌙 ${t('nav.darkMode')}`}
        </button>
        <button onClick={() => { clearTokens(); window.location.href = '/login'; }}
          className="text-sm text-gray-500 hover:text-red-500">{t('nav.logout')}</button>
      </aside>
      <main className="flex-1 p-8 overflow-auto"><Outlet /></main>
    </div>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="block px-3 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
    >
      {children}
    </Link>
  );
}
