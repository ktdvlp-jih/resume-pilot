import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Briefcase,
  LayoutDashboard,
  PenLine,
  Search,
  Settings,
  Sparkles,
} from 'lucide-react';
import { appHeaderNav, appSidebarGroups } from '@/config/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type CommandItem = {
  id: string;
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
};

export function CommandMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const items: CommandItem[] = useMemo(() => {
    const nav: CommandItem[] = appHeaderNav.map((item) => ({
      id: item.to,
      label: t(item.labelKey),
      to: item.to,
      icon: LayoutDashboard,
      group: t('nav.groupOverview'),
    }));
    appSidebarGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (nav.some((n) => n.to === item.to)) return;
        nav.push({
          id: item.to,
          label: t(item.labelKey),
          to: item.to,
          icon: item.icon ?? Sparkles,
          group: t(group.labelKey),
        });
      });
    });
    return nav;
  }, [t]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.label.toLowerCase().includes(q) || item.to.includes(q));
  }, [items, query]);

  const groups = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    filtered.forEach((item) => {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    });
    return map;
  }, [filtered]);

  const run = (to: string) => {
    setOpen(false);
    setQuery('');
    navigate(to);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg" showCloseButton={false}>
        <DialogHeader className="sr-only">
          <DialogTitle>{t('command.title')}</DialogTitle>
          <DialogDescription>{t('command.description')}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('command.placeholder')}
            className="border-0 shadow-none focus-visible:ring-0"
            autoFocus
          />
          <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            ESC
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('common.noResults')}</p>
          ) : (
            Array.from(groups.entries()).map(([group, groupItems]) => (
              <div key={group} className="mb-2">
                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{group}</p>
                {groupItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm',
                        'hover:bg-accent hover:text-accent-foreground',
                      )}
                      onClick={() => run(item.to)}
                    >
                      <Icon className="size-4 text-muted-foreground" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Decorative icons for landing - exported for reuse */
export const LandingIcons = { BookOpen, Briefcase, PenLine, Settings, Sparkles };
