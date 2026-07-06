import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Briefcase,
  LayoutDashboard,
  LogOut,
  Moon,
  PenLine,
  Settings,
  Sparkles,
  Sun,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { clearTokens } from '@/lib/api';
import { useTheme } from '@/lib/theme';
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
import { Button } from '@/components/ui/button';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, key: 'nav.dashboard' },
  { to: '/job-postings', icon: Briefcase, key: 'nav.jobPostings' },
  { to: '/experiences', icon: BookOpen, key: 'nav.experiences' },
  { to: '/writing-style', icon: PenLine, key: 'nav.writingStyle' },
  { to: '/workspace', icon: Sparkles, key: 'nav.workspace' },
  { to: '/settings', icon: Settings, key: 'nav.settings' },
] as const;

export function AppSidebar() {
  const { t } = useTranslation();
  const { theme, toggle } = useTheme();
  const location = useLocation();

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Logo to="/dashboard" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('nav.menu', { defaultValue: 'Menu' })}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ to, icon: Icon, key }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton asChild isActive={location.pathname === to || location.pathname.startsWith(`${to}/`)}>
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
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={toggle}>
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          <span>{theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}</span>
        </Button>
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
