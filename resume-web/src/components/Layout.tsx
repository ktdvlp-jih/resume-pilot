import { Link, Navigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clearTokens, getAccessToken } from '../lib/api';
import { useTheme } from '../lib/theme';
import { Logo } from './Logo';
import { LanguageSwitcher } from './LanguageSwitcher';

export function ProtectedLayout() {
  const { theme, toggle } = useTheme();
  const { t } = useTranslation();
  if (!getAccessToken()) {
    return <Navigate to="/login" replace />;
  }
  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950">
      <aside className="w-56 bg-white/80 dark:bg-zinc-900/90 backdrop-blur border-r border-zinc-200/80 dark:border-zinc-800 p-4 flex flex-col">
        <Logo to="/dashboard" />
        <LanguageSwitcher className="mb-4 w-full" />
        <nav className="space-y-2 flex-1">
          <NavItem to="/dashboard">{t('nav.dashboard')}</NavItem>
          <NavItem to="/job-postings">{t('nav.jobPostings')}</NavItem>
          <NavItem to="/experiences">{t('nav.experiences')}</NavItem>
          <NavItem to="/writing-style">{t('nav.writingStyle')}</NavItem>
          <NavItem to="/workspace">{t('nav.workspace')}</NavItem>
          <NavItem to="/settings">{t('nav.settings')}</NavItem>
        </nav>
        <button type="button" onClick={toggle} className="ui-sidebar-action mb-2">
          {theme === 'dark' ? `☀️ ${t('nav.lightMode')}` : `🌙 ${t('nav.darkMode')}`}
        </button>
        <button
          type="button"
          onClick={() => { clearTokens(); window.location.href = '/login'; }}
          className="ui-sidebar-action-danger"
        >
          {t('nav.logout')}
        </button>
      </aside>
      <main className="flex-1 p-8 overflow-auto"><Outlet /></main>
    </div>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="ui-nav-link">
      {children}
    </Link>
  );
}
