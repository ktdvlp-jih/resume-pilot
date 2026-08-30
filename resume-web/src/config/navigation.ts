import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  LayoutDashboard,
  PenLine,
  Settings,
  Sparkles,
} from 'lucide-react';

export type NavItem = {
  to: string;
  labelKey: string;
  icon?: LucideIcon;
  matchPrefix?: boolean;
};

export type NavGroup = {
  labelKey: string;
  items: NavItem[];
};

/** Public marketing header */
export const publicHeaderLinks = [
  { href: '/', labelKey: 'nav.intro' },
  { href: '/guides', labelKey: 'nav.guides' },
  { href: '/calendar', labelKey: 'nav.calendar' },
  { href: '/features', labelKey: 'nav.features' },
  { href: '/pricing', labelKey: 'nav.pricing' },
] as const;

/** Flat nav list derived from sidebar (command palette, etc.) */
export function flattenAppNav(): NavItem[] {
  const seen = new Set<string>();
  const items: NavItem[] = [];
  for (const group of appSidebarGroups) {
    for (const item of group.items) {
      if (seen.has(item.to)) continue;
      seen.add(item.to);
      items.push(item);
    }
  }
  return items;
}

/** App sidebar groups */
export const appSidebarGroups: NavGroup[] = [
  {
    labelKey: 'nav.groupOverview',
    items: [{ to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard }],
  },
  {
    labelKey: 'nav.groupPrepare',
    items: [
      { to: '/job-postings', labelKey: 'nav.jobPostings', icon: Briefcase },
      { to: '/job-calendar', labelKey: 'nav.calendar', icon: CalendarDays },
      { to: '/experiences', labelKey: 'nav.experiences', icon: BookOpen },
      { to: '/writing-style', labelKey: 'nav.writingStyle', icon: PenLine },
    ],
  },
  {
    labelKey: 'nav.groupCreate',
    items: [{ to: '/workspace', labelKey: 'nav.workspace', icon: Sparkles, matchPrefix: false }],
  },
  {
    labelKey: 'nav.groupAccount',
    items: [{ to: '/settings', labelKey: 'nav.settings', icon: Settings }],
  },
];

export function isNavActive(pathname: string, item: NavItem): boolean {
  if (item.to === '/dashboard') {
    return pathname === '/dashboard' || pathname.startsWith('/resumes/');
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export function currentNavItem(pathname: string): NavItem | undefined {
  return flattenAppNav().find((item) => isNavActive(pathname, item));
}
