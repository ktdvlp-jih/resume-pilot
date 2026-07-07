import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, FileText, ScrollText, Search, ShieldBan, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/prompts', icon: FileText, key: 'nav.prompts' },
  { to: '/forbidden-expressions', icon: ShieldBan, key: 'nav.forbidden' },
  { to: '/companies', icon: Building2, key: 'nav.companies' },
  { to: '/users', icon: Users, key: 'nav.users' },
  { to: '/ai-logs', icon: ScrollText, key: 'nav.aiLogs' },
] as const;

export function CommandMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

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

  const items = useMemo(
    () =>
      navItems.map((item) => ({
        id: item.to,
        label: t(item.key),
        to: item.to,
        icon: item.icon,
      })),
    [t],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.label.toLowerCase().includes(q) || item.to.includes(q));
  }, [items, query]);

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
            filtered.map((item) => {
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
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
