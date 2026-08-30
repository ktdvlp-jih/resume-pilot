import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, Briefcase, Bot, FileText, Link2, LogOut, ScrollText, Settings2, ShieldBan, Sparkles, Users } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { LogoMark } from '@/components/Logo';
import { clearTokens, getUserRole } from '@/lib/api';
import { canManageJobPostings, canManageUsers, isFullAdmin } from '@/lib/roles';
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
  { to: '/prompts', icon: FileText, key: 'nav.prompts', kind: 'full' },
  { to: '/forbidden-expressions', icon: ShieldBan, key: 'nav.forbidden', kind: 'full' },
  { to: '/companies', icon: Building2, key: 'nav.companies', kind: 'full' },
  { to: '/job-postings', icon: Briefcase, key: 'nav.jobPostings', kind: 'jobs' },
  { to: '/skill-catalog', icon: Sparkles, key: 'nav.skillCatalog', kind: 'full' },
  { to: '/users', icon: Users, key: 'nav.users', kind: 'users' },
  { to: '/bot-links', icon: Link2, key: 'nav.botLinks', kind: 'full' },
  { to: '/ai-logs', icon: ScrollText, key: 'nav.aiLogs', kind: 'full' },
  { to: '/llm-settings', icon: Bot, key: 'nav.llmSettings', kind: 'full' },
  { to: '/deploy-ci-settings', icon: Settings2, key: 'nav.deploySettings', kind: 'full' },
] as const;

export function AdminSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const role = getUserRole();
  const visibleNav = navItems.filter((item) => {
    if (item.kind === 'jobs') return canManageJobPostings(role);
    if (item.kind === 'users') return canManageUsers(role);
    return isFullAdmin(role);
  });

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <a
          href="/admin/"
          aria-label="ResumePilot Admin"
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 font-semibold tracking-tight transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogoMark size={28} className="shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">
            ResumePilot
            <span className="ml-1.5 text-xs font-medium text-muted-foreground">Admin</span>
          </span>
        </a>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('nav.menu', { defaultValue: 'Menu' })}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNav.map(({ to, icon: Icon, key }) => (
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
            window.location.href = '/admin/login';
          }}
        >
          <LogOut className="size-4" />
          <span>{t('nav.logout')}</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
