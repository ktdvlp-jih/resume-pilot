import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ExperienceResponse } from '@/lib/api';
import { api } from '@/lib/api';
import { EXPERIENCE_FIELD_LIMITS, experienceReadiness } from '@/lib/experience-limits';
import {
  emptyExperienceForm,
  experienceToForm,
  isExperienceFormOverLimit,
  payloadFromExperienceForm,
  type ExperienceForm,
} from '@/lib/experience-form';
import { EXPERIENCE_TYPES } from '@/i18n';
import { StatusChip } from '@/components/common/status-chip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  experience: ExperienceResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (exp: ExperienceResponse) => void;
  onCoach?: (exp: ExperienceResponse) => void;
  onContinueChat?: (exp: ExperienceResponse) => void;
};

function formatDate(iso?: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${y}. ${m}. ${d}.`;
}

function CharCount({ value, max }: { value: string; max: number }) {
  const len = value.length;
  const over = len > max;
  return (
    <span className={`text-xs tabular-nums ${over ? 'text-destructive' : 'text-muted-foreground'}`}>
      {len}/{max}
    </span>
  );
}

export function ExperienceDetailModal({
  experience,
  open,
  onOpenChange,
  onUpdated,
  onCoach,
  onContinueChat,
}: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [showStar, setShowStar] = useState(false);
  const [form, setForm] = useState<ExperienceForm>(emptyExperienceForm);

  const expId = experience?.id;

  const { data: linkedSession } = useQuery({
    queryKey: ['experience-chat-link', expId],
    queryFn: () => api.getExperienceChatSessionForExperience(expId!),
    enabled: open && Boolean(expId) && !editing,
  });

  useEffect(() => {
    if (!open) {
      setEditing(false);
      return;
    }
    if (experience) {
      setForm(experienceToForm(experience));
      setShowStar(Boolean(experience.starSituation || experience.starTask || experience.starAction || experience.starResult));
      setEditing(false);
    }
  }, [open, experience?.id, experience]);

  const updateMutation = useMutation({
    mutationFn: () => api.updateExperience(expId!, payloadFromExperienceForm(form)),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      onUpdated?.(updated);
      setEditing(false);
      toast.success(t('common.saved'));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t('common.error')),
  });

  if (!experience) return null;

  const readiness = experienceReadiness(editing ? form : experience);
  const readinessPct = readiness === 'ready' ? 100 : readiness === 'thin' ? 55 : 20;
  const formOverLimit = isExperienceFormOverLimit(form);
  const draftReadiness = experienceReadiness(form);

  const handleOpenChange = (next: boolean) => {
    if (!next) setEditing(false);
    onOpenChange(next);
  };

  const startEditing = () => {
    setForm(experienceToForm(experience));
    setShowStar(Boolean(experience.starSituation || experience.starTask || experience.starAction || experience.starResult));
    setEditing(true);
  };

  const cancelEditing = () => {
    setForm(experienceToForm(experience));
    setEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[min(85vh,720px)] overflow-y-auto sm:max-w-lg">
        {editing ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-left">{t('common.edit')}</DialogTitle>
              <DialogDescription className="text-left">{experience.title}</DialogDescription>
            </DialogHeader>

            <form
              className="space-y-4 text-sm"
              onSubmit={(e) => {
                e.preventDefault();
                if (formOverLimit || !form.title.trim() || updateMutation.isPending) return;
                updateMutation.mutate();
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">{t('experiences.readinessLabel')}</span>
                <StatusChip
                  label={t(`experiences.readiness.${draftReadiness}`)}
                  variant={draftReadiness === 'ready' ? 'success' : draftReadiness === 'thin' ? 'warning' : 'default'}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('experiences.typeLabel')}</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPERIENCE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`experienceType.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>{t('experiences.titlePlaceholder')}</Label>
                    <CharCount value={form.title} max={EXPERIENCE_FIELD_LIMITS.title} />
                  </div>
                  <Input
                    value={form.title}
                    maxLength={EXPERIENCE_FIELD_LIMITS.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>{t('experiences.rolePlaceholder')}</Label>
                    <CharCount value={form.role} max={EXPERIENCE_FIELD_LIMITS.role} />
                  </div>
                  <Input
                    value={form.role}
                    maxLength={EXPERIENCE_FIELD_LIMITS.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>{t('experiences.startDate')}</Label>
                    <Input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('experiences.endDate')}</Label>
                    <Input
                      type="date"
                      value={form.endDate}
                      disabled={form.ongoing}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value, ongoing: false })}
                    />
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={form.ongoing}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            ongoing: e.target.checked,
                            endDate: e.target.checked ? '' : form.endDate,
                          })
                        }
                        className="size-3.5 rounded border-input accent-primary"
                      />
                      {t('experiences.ongoing')}
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>{t('experiences.descriptionPlaceholder')}</Label>
                  <CharCount value={form.description} max={EXPERIENCE_FIELD_LIMITS.description} />
                </div>
                <Textarea
                  value={form.description}
                  maxLength={EXPERIENCE_FIELD_LIMITS.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>{t('experiences.resultLabel')}</Label>
                  <CharCount value={form.result} max={EXPERIENCE_FIELD_LIMITS.result} />
                </div>
                <Textarea
                  value={form.result}
                  maxLength={EXPERIENCE_FIELD_LIMITS.result}
                  onChange={(e) => setForm({ ...form, result: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>{t('experiences.numericResult')}</Label>
                  <CharCount value={form.numericResult} max={EXPERIENCE_FIELD_LIMITS.numericResult} />
                </div>
                <Input
                  value={form.numericResult}
                  maxLength={EXPERIENCE_FIELD_LIMITS.numericResult}
                  onChange={(e) => setForm({ ...form, numericResult: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>{t('experiences.contribution')}</Label>
                  <CharCount value={form.contribution} max={EXPERIENCE_FIELD_LIMITS.contribution} />
                </div>
                <Textarea
                  value={form.contribution}
                  maxLength={EXPERIENCE_FIELD_LIMITS.contribution}
                  onChange={(e) => setForm({ ...form, contribution: e.target.value })}
                  rows={2}
                  placeholder={t('experiences.contributionExample')}
                />
              </div>

              <div className="rounded-lg border border-dashed border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{t('experiences.starTitle')}</p>
                    <p className="text-xs text-muted-foreground">{t('experiences.starHint')}</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowStar((v) => !v)}>
                    {showStar ? t('experiences.starHide') : t('experiences.starShow')}
                  </Button>
                </div>
                {showStar ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        ['starSituation', 'starSituation'],
                        ['starTask', 'starTask'],
                        ['starAction', 'starAction'],
                        ['starResult', 'starResult'],
                      ] as const
                    ).map(([key, labelKey]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Label>{t(`experiences.${labelKey}`)}</Label>
                          <CharCount value={form[key]} max={EXPERIENCE_FIELD_LIMITS.star} />
                        </div>
                        <Textarea
                          value={form[key]}
                          maxLength={EXPERIENCE_FIELD_LIMITS.star}
                          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                          rows={2}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" onClick={cancelEditing} disabled={updateMutation.isPending}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending || formOverLimit || !form.title.trim()}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {t('common.generating')}
                    </>
                  ) : (
                    t('common.save')
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2 pr-6">
                <StatusChip
                  label={t(`experienceType.${experience.type}`, { defaultValue: experience.type })}
                  variant="primary"
                />
                <StatusChip
                  label={t(`experiences.readiness.${readiness}`)}
                  variant={readiness === 'ready' ? 'success' : readiness === 'thin' ? 'warning' : 'default'}
                />
              </div>
              <DialogTitle className="text-left leading-snug">{experience.title}</DialogTitle>
              <DialogDescription className="text-left">
                {formatDate(experience.startDate)} —{' '}
                {experience.endDate ? formatDate(experience.endDate) : t('portfolio.present')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              {experience.role && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t('experiences.columns.role')}</p>
                  <p>{experience.role}</p>
                </div>
              )}
              {experience.description && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t('experiences.descriptionPlaceholder')}
                  </p>
                  <p className="text-pretty whitespace-pre-wrap">{experience.description}</p>
                </div>
              )}
              {experience.result && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t('experiences.resultLabel')}</p>
                  <p>{experience.result}</p>
                </div>
              )}
              {experience.numericResult && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t('experiences.numericResult')}</p>
                  <p>{experience.numericResult}</p>
                </div>
              )}
              {(experience.skills?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {experience.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t('experiences.readinessLabel')}</span>
                  <span>{t(`experiences.readiness.${readiness}`)}</span>
                </div>
                <Progress value={readinessPct} className="h-1.5" />
              </div>
            </div>

            <DialogFooter className="flex-col items-stretch gap-2 sm:items-start">
              {linkedSession && onContinueChat && (
                <p className="text-xs text-muted-foreground">{t('experiences.chatContinueHint')}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {linkedSession && onContinueChat ? (
                  <Button type="button" onClick={() => onContinueChat(experience)}>
                    {t('experiences.chatContinue')}
                  </Button>
                ) : null}
                {onCoach && (
                  <Button
                    type="button"
                    variant={linkedSession ? 'secondary' : 'default'}
                    onClick={() => onCoach(experience)}
                  >
                    {t('experiences.chatCoach')}
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={startEditing}>
                  {t('common.edit')}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
