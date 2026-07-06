import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, FileText, LogOut, ScrollText, ShieldBan, Users } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { clearTokens } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';

const navItems = [
  { to: '/prompts', icon: FileText, key: 'nav.prompts' },
  { to: '/forbidden-expressions', icon: ShieldBan, key: 'nav.forbidden' },
  { to: '/companies', icon: Building2, key: 'nav.companies' },
  { to: '/users', icon: Users, key: 'nav.users' },
  { to: '/ai-logs', icon: ScrollText, key: 'nav.aiLogs' },
] as const;

export function AdminSidebar() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <h1 className="font-semibold text-lg group-data-[collapsible=icon]:hidden">{t('admin.title')}</h1>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('nav.menu', { defaultValue: 'Menu' })}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ to, icon: Icon, key }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton asChild isActive={location.pathname === to}>
                    <Link to={to}>
                      <Icon />
                      <span>{t(key)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-2">
        <LanguageSwitcher />
        <SidebarSeparator />
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-destructive hover:text-destructive"
          onClick={() => {
            clearTokens();
            window.location.href = '/login';
          }}
        >
          <LogOut className="size-4" />
          <span>{t('nav.logout')}</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
