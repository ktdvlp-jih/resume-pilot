import { Navigate } from 'react-router-dom';
import { getAccessToken, getUserRole } from '@/lib/api';
import { AdminSidebar } from '@/components/admin-sidebar';
import { AdminHeader } from '@/components/layout/admin-header';
import { CommandMenu } from '@/components/layout/command-menu';
import { PageTransition } from '@/components/layout/page-transition';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export function AdminLayout() {
  if (!getAccessToken()) {
    return <Navigate to="/login" replace />;
  }
  if (getUserRole() !== 'ADMIN') {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <AdminHeader />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <PageTransition />
        </main>
      </SidebarInset>
      <CommandMenu />
    </SidebarProvider>
  );
}
