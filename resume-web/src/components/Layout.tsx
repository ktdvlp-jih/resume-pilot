import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAccessToken } from '@/lib/api';
import { useIdleSession } from '@/hooks/use-idle-session';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { CommandMenu } from '@/components/layout/command-menu';
import { PageTransition } from '@/components/layout/page-transition';
import { DocumentHead } from '@/components/seo/document-head';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export function ProtectedLayout() {
  useIdleSession('/login');
  const { t } = useTranslation();
  const { pathname } = useLocation();
  if (!getAccessToken()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <DocumentHead title={t('app.name')} description={t('app.tagline')} path={pathname} noIndex />
      <AppSidebar />
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <PageTransition />
        </main>
      </SidebarInset>
      <CommandMenu />
    </SidebarProvider>
  );
}
