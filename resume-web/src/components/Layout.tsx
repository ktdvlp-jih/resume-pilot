import { Navigate } from 'react-router-dom';
import { getAccessToken } from '@/lib/api';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { CommandMenu } from '@/components/layout/command-menu';
import { PageTransition } from '@/components/layout/page-transition';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export function ProtectedLayout() {
  if (!getAccessToken()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
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
