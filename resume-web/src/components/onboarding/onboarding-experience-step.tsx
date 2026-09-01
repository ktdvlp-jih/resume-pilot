import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, type ExperienceResponse } from '@/lib/api';
import { EXPERIENCE_TYPES } from '@/i18n';
import {
  emptyExperienceForm,
  isExperienceFormOverLimit,
  payloadFromExperienceForm,
  type ExperienceForm,
} from '@/lib/experience-form';
import { EXPERIENCE_FIELD_LIMITS } from '@/lib/experience-limits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
};

function CharCount({ value, max }: { value: string; max: number }) {
  return (
    <span className={cn('text-xs tabular-nums', value.length > max ? 'text-destructive' : 'text-muted-foreground')}>
      {value.length}/{max}
    </span>
  );
}

export function OnboardingExperienceStep({ selectedIds, onSelectedIdsChange }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ExperienceForm>(emptyExperienceForm);

  const { data: experiences = [], isLoading } = useQuery({
    queryKey: ['experiences'],
    queryFn: () => api.listExperiences(),
  });

  const formOverLimit = isExperienceFormOverLimit(form);

  const createMutation = useMutation({
    mutationFn: () => api.createExperience(payloadFromExperienceForm(form)),
    onSuccess: (created) => {
      toast.success(t('onboardingFlow.experienceSaved'));
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      if (!selectedIds.includes(created.id)) {
        onSelectedIdsChange([...selectedIds, created.id]);
      }
      setForm(emptyExperienceForm());
      setShowForm(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleExperience = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectedIdsChange(selectedIds.filter((x) => x !== id));
      return;
    }
    onSelectedIdsChange([...selectedIds, id]);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={showForm ? 'secondary' : 'outline'}
          onClick={() => setShowForm((v) => !v)}
        >
          {t('onboardingFlow.experienceCta')}
        </Button>
      </div>

      {showForm ? (
        <form
          className="space-y-4 rounded-lg border bg-muted/20 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (formOverLimit || !form.title.trim()) return;
            createMutation.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>{t('experiences.titlePlaceholder')}</Label>
                <CharCount value={form.title} max={EXPERIENCE_FIELD_LIMITS.title} />
              </div>
              <Input
                value={form.title}
                maxLength={EXPERIENCE_FIELD_LIMITS.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t('experiences.titleExample')}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>{t('experiences.rolePlaceholder')}</Label>
              <CharCount value={form.role} max={EXPERIENCE_FIELD_LIMITS.role} />
            </div>
            <Input
              value={form.role}
              maxLength={EXPERIENCE_FIELD_LIMITS.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder={t('experiences.roleExample')}
            />
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
              placeholder={t('experiences.descriptionExample')}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              disabled={createMutation.isPending || formOverLimit || !form.title.trim()}
            >
              {createMutation.isPending ? t('common.loading') : t('common.save')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : experiences.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{t('onboardingFlow.experiencePickHint')}</p>
          <ul className="max-h-48 space-y-2 overflow-y-auto">
            {experiences.map((exp: ExperienceResponse) => {
              const checked = selectedIds.includes(exp.id);
              return (
                <li key={exp.id}>
                  <label
                    className={cn(
                      'flex cursor-pointer gap-3 rounded-lg border px-3 py-2 hover:bg-muted/40',
                      checked && 'border-primary/40 bg-primary/5',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-primary"
                      checked={checked}
                      onChange={() => toggleExperience(exp.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{exp.title}</span>
                      {exp.role ? (
                        <span className="block text-sm text-muted-foreground">{exp.role}</span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('onboardingFlow.experienceEmpty')}</p>
      )}
    </div>
  );
}
