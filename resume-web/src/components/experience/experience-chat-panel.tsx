import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageSquarePlus, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { asArray } from '@/lib/query-utils';
import { storeExperienceChatSessionId } from '@/lib/experience-chat-storage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type Props = {
  sessionId: string | null;
  onSessionChange: (sessionId: string | null) => void;
  onApplied?: () => void;
  className?: string;
};

const SESSIONS_KEY = ['experience-chat-sessions'] as const;
const sessionKey = (id: string) => ['experience-chat-session', id] as const;

const SUGGEST_KEYS = ['experiences.chatSuggest1', 'experiences.chatSuggest2', 'experiences.chatSuggest3'] as const;

export function ExperienceChatPanel({
  sessionId,
  onSessionChange,
  onApplied,
  className,
}: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    storeExperienceChatSessionId(sessionId);
  }, [sessionId]);

  const { data: sessions = [] } = useQuery({
    queryKey: SESSIONS_KEY,
    queryFn: () => api.listExperienceChatSessions(),
  });

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: sessionId ? sessionKey(sessionId) : ['experience-chat-session', 'none'],
    queryFn: () => api.getExperienceChatSession(sessionId!),
    enabled: Boolean(sessionId),
  });

  const createMutation = useMutation({
    mutationFn: (targetId?: string) => api.createExperienceChatSession(targetId),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
      queryClient.setQueryData(sessionKey(created.id), created);
      onSessionChange(created.id);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t('common.error')),
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => api.resumeExperienceChatSession(id),
    onSuccess: async (resumed) => {
      queryClient.setQueryData(sessionKey(resumed.id), resumed);
      await queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t('common.error')),
  });

  const sendMutation = useMutation({
    mutationFn: (message: string) => api.sendExperienceChatMessage(sessionId!, message),
    onSuccess: async () => {
      setInput('');
      await queryClient.invalidateQueries({ queryKey: sessionKey(sessionId!) });
      await queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t('common.error')),
  });

  const applyMutation = useMutation({
    mutationFn: () => api.applyExperienceChatDraft(sessionId!),
    onSuccess: async () => {
      toast.success(t('experiences.chatSaved'));
      await queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
      await queryClient.invalidateQueries({ queryKey: sessionKey(sessionId!) });
      onApplied?.();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t('common.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteExperienceChatSession(sessionId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
      onSessionChange(null);
    },
    onError: () => toast.error(t('common.error')),
  });

  useEffect(() => {
    if (session?.status === 'APPLIED' && sessionId && !resumeMutation.isPending) {
      resumeMutation.mutate(sessionId);
    }
  }, [session?.status, sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const sessionMessages = asArray(session?.messages);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessionMessages.length, sendMutation.isPending]);

  const draftTitle = String(session?.latestDraft?.title ?? '').trim();
  const canApply = Boolean(sessionId && draftTitle && session?.status === 'ACTIVE');
  const busy =
    sendMutation.isPending ||
    createMutation.isPending ||
    applyMutation.isPending ||
    resumeMutation.isPending;

  const showSuggestions =
    session?.status === 'ACTIVE' &&
    (sessionMessages.length <= 2 || !draftTitle) &&
    !sendMutation.isPending;

  const handleNewSession = () => {
    createMutation.mutate(undefined);
  };

  const handleSend = (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || !sessionId || busy) return;
    sendMutation.mutate(text);
  };

  return (
    <Card className={cn('flex min-h-0 flex-col', className)}>
      <CardHeader className="shrink-0 space-y-3 border-b pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{t('experiences.chatTitle')}</CardTitle>
            <CardDescription>{t('experiences.chatSavedContinue')}</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            title={t('experiences.chatNew')}
            onClick={handleNewSession}
            disabled={createMutation.isPending}
          >
            <MessageSquarePlus className="size-4" />
          </Button>
        </div>
        {sessions.length > 0 && (
          <Select
            value={sessionId ?? ''}
            onValueChange={(v) => onSessionChange(v || null)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('experiences.chatSelectSession')} />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.title}
                  {s.appliedExperienceId ? ` · ${t('experiences.chatDraft')}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-4 pt-3">
        {!sessionId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
            <p>{t('experiences.chatEmpty')}</p>
            <Button type="button" onClick={handleNewSession} disabled={createMutation.isPending}>
              {t('experiences.chatStart')}
            </Button>
          </div>
        ) : sessionLoading && !session ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <ScrollArea className="min-h-0 flex-1 pr-2">
              <div className="space-y-3 pb-2">
                {sessionMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'max-w-[95%] rounded-lg px-3 py-2 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'ml-auto bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground',
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}
                {sendMutation.isPending && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    {t('common.generating')}
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            {showSuggestions && (
              <div className="flex flex-wrap gap-2">
                {SUGGEST_KEYS.map((key) => (
                  <Button
                    key={key}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto whitespace-normal py-1.5 text-left text-xs font-normal"
                    disabled={busy}
                    onClick={() => handleSend(t(key))}
                  >
                    {t(key)}
                  </Button>
                ))}
              </div>
            )}

            {draftTitle && (
              <div className="shrink-0 rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="text-xs font-medium text-muted-foreground">{t('experiences.chatDraft')}</p>
                <p className="mt-1 font-medium">{draftTitle}</p>
                {session?.latestDraft?.role ? (
                  <p className="mt-1 text-muted-foreground">{String(session.latestDraft.role)}</p>
                ) : null}
                {(session?.latestDraft?.skills as string[] | undefined)?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {((session?.latestDraft?.skills as string[]) ?? []).slice(0, 6).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            <div className="shrink-0 space-y-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('experiences.chatInputPlaceholder')}
                rows={3}
                disabled={busy || session?.status !== 'ACTIVE'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={!sessionId || deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate()}
                >
                  <Trash2 className="size-3.5" />
                  {t('experiences.chatDeleteSession')}
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!canApply || applyMutation.isPending}
                    onClick={() => applyMutation.mutate()}
                  >
                    {t('experiences.chatSave')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!input.trim() || busy || session?.status !== 'ACTIVE'}
                    onClick={() => handleSend()}
                  >
                    <Send className="size-3.5" />
                    {t('experiences.chatSend')}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
