import { Link, Navigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';
import { clearTokens, getAccessToken } from '../lib/api';

export function AdminLayout() {
  const { t } = useTranslation();

  if (!getAccessToken()) {
    return <Navigate to="/login" replace />;
  }
  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-gray-900 text-white p-4">
        <h1 className="text-xl font-bold mb-4">{t('admin.title')}</h1>
        <LanguageSwitcher className="mb-8 w-full text-gray-900" />
        <nav className="space-y-2">
          <NavItem to="/prompts">{t('nav.prompts')}</NavItem>
          <NavItem to="/forbidden-expressions">{t('nav.forbidden')}</NavItem>
          <NavItem to="/companies">{t('nav.companies')}</NavItem>
          <NavItem to="/users">{t('nav.users')}</NavItem>
          <NavItem to="/ai-logs">{t('nav.aiLogs')}</NavItem>
        </nav>
        <button onClick={() => { clearTokens(); window.location.href = '/login'; }}
          className="mt-8 text-sm text-gray-400 hover:text-red-400">{t('nav.logout')}</button>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="block px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300">{children}</Link>
  );
}
