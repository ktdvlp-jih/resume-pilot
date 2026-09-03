import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Send, X } from 'lucide-react';
import { LogoMark } from '@/components/Logo';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  role: ChatRole;
  content: string;
};

const CHIP_KEYS = ['chipSignup', 'chipExperience', 'chipJob', 'chipWorkspace'] as const;
const GREETING_DISMISS_KEY = 'rp-help-greeting-dismissed';
const OPEN_KEY = 'rp-help-chat-open';
const MESSAGES_KEY = 'rp-help-chat-messages';

function pageLabelForPath(pathname: string, t: (key: string) => string): string {
  if (pathname === '/') return t('helpChat.pageHome');
  if (pathname.startsWith('/guides')) return t('helpChat.pageGuides');
  if (pathname.startsWith('/features')) return t('helpChat.pageFeatures');
  if (pathname.startsWith('/pricing')) return t('helpChat.pagePricing');
  if (pathname.startsWith('/contact')) return t('helpChat.pageContact');
  if (pathname.startsWith('/calendar')) return t('helpChat.pageCalendar');
  if (pathname.startsWith('/tools/')) return t('helpChat.pageTools');
  if (pathname.startsWith('/shared/')) return t('helpChat.pageShared');
  if (pathname.startsWith('/legal') || pathname.startsWith('/terms') || pathname.startsWith('/privacy')) {
    return t('helpChat.pageLegal');
  }
  return t('helpChat.pageOther');
}

function loadOpen(): boolean {
  try {
    return sessionStorage.getItem(OPEN_KEY) === '1';
  } catch {
    return false;
  }
}

function loadMessages(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(MESSAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (m): m is ChatMessage =>
          !!m &&
          typeof m === 'object' &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim().length > 0,
      )
      .slice(-40);
  } catch {
    return [];
  }
}

function BotAvatar({ size = 36 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 ring-1 ring-border"
      style={{ width: size, height: size }}
    >
      <LogoMark size={Math.round(size * 0.72)} className="rounded-[20%]" />
    </span>
  );
}

export function HelpChatWidget() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(loadOpen);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showGreeting, setShowGreeting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const [footerLift, setFooterLift] = useState(0);
  const pageLabel = pageLabelForPath(pathname, t);

  useEffect(() => {
    if (sessionStorage.getItem(GREETING_DISMISS_KEY) === '1') return;
    const timer = window.setTimeout(() => setShowGreeting(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(OPEN_KEY, open ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [open]);

  useEffect(() => {
    try {
      sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
    } catch {
      /* ignore */
    }
  }, [messages]);

  useEffect(() => {
    const footer = document.querySelector('footer');
    if (!footer) return;

    const updateLift = () => {
      const rect = footer.getBoundingClientRect();
      const overlap = Math.max(0, window.innerHeight - rect.top);
      setFooterLift(overlap);
    };

    updateLift();
    window.addEventListener('scroll', updateLift, { passive: true });
    window.addEventListener('resize', updateLift);
    return () => {
      window.removeEventListener('scroll', updateLift);
      window.removeEventListener('resize', updateLift);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const viewport = messagesScrollRef.current?.querySelector('[data-slot="scroll-area-viewport"]');
    if (viewport instanceof HTMLElement) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [messages, open, loading]);

  const dismissGreeting = () => {
    setShowGreeting(false);
    sessionStorage.setItem(GREETING_DISMISS_KEY, '1');
  };

  const openChat = () => {
    dismissGreeting();
    setOpen(true);
  };

  const closeChat = () => setOpen(false);

  const toggleChat = () => {
    if (open) closeChat();
    else openChat();
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setLoading(true);
    try {
      const history = nextMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
      const result = await api.sendHelpChat(trimmed, history, {
        pagePath: pathname,
        pageLabel,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: result.reply || t('helpChat.error') }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('helpChat.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 flex flex-col items-end gap-3 p-4 sm:p-5"
      style={{ bottom: footerLift }}
    >
      {open && (
        <aside
          className={cn(
            'pointer-events-auto flex w-[min(100%,28rem)] flex-col overflow-hidden',
            'h-[min(72svh,36rem)] rounded-2xl border border-border bg-background shadow-2xl',
            'animate-in fade-in-0 slide-in-from-bottom-3 duration-200',
          )}
          aria-label={t('helpChat.title')}
        >
          <header className="flex shrink-0 items-center gap-3 bg-primary px-4 py-3.5 text-primary-foreground">
            <BotAvatar size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold leading-tight">{t('helpChat.agentName')}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-primary-foreground/85">
                <span className="size-1.5 rounded-full bg-emerald-300" aria-hidden />
                {t('helpChat.online')}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-primary-foreground/70">
                {t('helpChat.viewingPage', { page: pageLabel })}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 rounded-full text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
              aria-label={t('helpChat.close')}
              onClick={closeChat}
            >
              <X className="size-5" />
            </Button>
          </header>

          <div ref={messagesScrollRef} className="min-h-0 flex-1">
          <ScrollArea className="h-full bg-muted/20 px-3 py-4">
            <div className="space-y-3 pb-2">
              <div className="flex items-end gap-2">
                <BotAvatar size={28} />
                <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-card px-3.5 py-2.5 text-sm leading-relaxed shadow-sm">
                  {t('helpChat.welcome')}
                </div>
              </div>

              {messages.length === 0 && (
                <div className="flex flex-wrap gap-2 pl-9">
                  {CHIP_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      disabled={loading}
                      className="rounded-full border border-primary/25 bg-card px-3 py-1.5 text-xs text-primary shadow-sm transition-all duration-150 hover:border-primary/50 hover:bg-primary/10 hover:shadow-md hover:-translate-y-px active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
                      onClick={() => send(t(`helpChat.${key}`))}
                    >
                      {t(`helpChat.${key}`)}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((m, idx) =>
                m.role === 'user' ? (
                  <div key={`u-${idx}`} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-primary-foreground shadow-sm">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={`a-${idx}`} className="flex items-end gap-2">
                    <BotAvatar size={28} />
                    <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-card px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
                      {m.content}
                    </div>
                  </div>
                ),
              )}

              {loading && (
                <div className="flex items-end gap-2">
                  <BotAvatar size={28} />
                  <div className="rounded-2xl rounded-bl-md border border-border bg-card px-3.5 py-2.5 text-sm text-muted-foreground shadow-sm">
                    <span className="inline-flex gap-1">
                      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:0ms]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:150ms]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:300ms]" />
                    </span>
                  </div>
                </div>
              )}
              {error && <p className="pl-9 text-sm text-destructive">{error}</p>}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
          </div>

          <div className="space-y-2 border-t border-border bg-card p-3">
            {messages.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {CHIP_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    disabled={loading}
                    className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground transition-all duration-150 hover:border-primary/40 hover:bg-primary/10 hover:text-primary hover:shadow-sm disabled:opacity-50"
                    onClick={() => send(t(`helpChat.${key}`))}
                  >
                    {t(`helpChat.${key}`)}
                  </button>
                ))}
              </div>
            )}
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('helpChat.placeholder')}
                className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                disabled={loading}
                autoComplete="off"
              />
              <Button
                type="submit"
                className="h-10 shrink-0 rounded-xl px-4"
                disabled={loading || !input.trim()}
              >
                {t('helpChat.send')}
              </Button>
            </form>
            <p className="px-1 text-center text-[13px] text-muted-foreground">
              <Link
                to="/guides"
                className="rounded-sm px-0.5 transition-colors duration-150 hover:text-primary hover:underline underline-offset-4"
              >
                {t('helpChat.linkGuides')}
              </Link>
              {' · '}
              <Link
                to="/pricing"
                className="rounded-sm px-0.5 transition-colors duration-150 hover:text-primary hover:underline underline-offset-4"
              >
                {t('helpChat.linkPricing')}
              </Link>
              {' · '}
              <Link
                to="/contact"
                className="rounded-sm px-0.5 transition-colors duration-150 hover:text-primary hover:underline underline-offset-4"
              >
                {t('helpChat.linkContact')}
              </Link>
            </p>
          </div>
        </aside>
      )}

      {!open && showGreeting && (
        <button
          type="button"
          onClick={openChat}
          className={cn(
            'pointer-events-auto relative mr-1 flex max-w-[min(100%,20rem)] items-start gap-3 rounded-full border border-border/80',
            'bg-card px-3.5 py-3 text-left shadow-lg ring-1 ring-black/5 transition hover:shadow-xl',
            'animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
          )}
        >
          <BotAvatar size={40} />
          <span className="min-w-0 flex-1 pr-5 pt-0.5">
            <span className="block text-sm font-semibold leading-snug text-foreground">
              {t('helpChat.proactiveHi')}
            </span>
            <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">
              {t('helpChat.proactiveAsk')}
            </span>
            <span className="mt-1 block text-[11px] text-muted-foreground/80">
              {t('helpChat.proactiveJustNow')}
            </span>
          </span>
          <span
            role="button"
            tabIndex={0}
            aria-label={t('helpChat.closeGreeting')}
            className="absolute top-2 right-2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              dismissGreeting();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                dismissGreeting();
              }
            }}
          >
            <X className="size-3.5" />
          </span>
        </button>
      )}

      <Button
        type="button"
        size="lg"
        variant="ghost"
        className={cn(
          'pointer-events-auto size-16 overflow-hidden rounded-[28%] p-0',
          'shadow-lg ring-4 ring-primary/25 transition hover:ring-primary/40 hover:opacity-95',
          'focus-visible:ring-4 focus-visible:ring-primary/50',
          open && 'ring-primary/45',
        )}
        aria-label={open ? t('helpChat.close') : t('helpChat.open')}
        title={open ? t('helpChat.close') : t('helpChat.open')}
        aria-expanded={open}
        onClick={toggleChat}
      >
        {open ? (
          <span className="flex size-full items-center justify-center bg-primary text-primary-foreground">
            <X className="size-7" strokeWidth={2.25} />
          </span>
        ) : (
          <LogoMark size={64} className="size-full rounded-[28%] object-cover" />
        )}
      </Button>
    </div>
  );
}
