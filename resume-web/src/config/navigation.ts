import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Briefcase,
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

/** Public marketing header (anchors on landing) */
export const publicHeaderLinks = [
  { href: '/#intro', labelKey: 'nav.intro' },
  { href: '/#features', labelKey: 'nav.features' },
  { href: '/#pricing', labelKey: 'nav.pricing' },
] as const;

/** App top header — Logo is separate (always /) */
export const appHeaderNav: NavItem[] = [
  { to: '/dashboard', labelKey: 'nav.dashboard' },
  { to: '/job-postings', labelKey: 'nav.jobPostings' },
  { to: '/workspace', labelKey: 'nav.workspace' },
  { to: '/settings', labelKey: 'nav.profile' },
];

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
