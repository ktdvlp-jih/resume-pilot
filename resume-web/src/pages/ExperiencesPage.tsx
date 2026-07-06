import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { EXPERIENCE_TYPES } from '@/i18n';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

export default function ExperiencesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'PROJECT', title: '', description: '', role: '', result: '' });

  const { data: experiences = [], isLoading } = useQuery({ queryKey: ['experiences'], queryFn: () => api.listExperiences() });

  const createMutation = useMutation({
    mutationFn: api.createExperience,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      setShowForm(false);
      setForm({ type: 'PROJECT', title: '', description: '', role: '', result: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteExperience,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['experiences'] }),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={t('experiences.title')}
        action={
          <Button variant={showForm ? 'outline' : 'default'} onClick={() => setShowForm(!showForm)}>
            {showForm ? t('common.cancel') : t('experiences.add')}
          </Button>
        }
      />

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t('experiences.add')}</CardTitle>
          </CardHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(form);
            }}
          >
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('experiences.titlePlaceholder')}</Label>
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
                <Label>{t('experiences.titlePlaceholder')}</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>{t('experiences.descriptionPlaceholder')}</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>{t('experiences.rolePlaceholder')}</Label>
                <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('experiences.resultPlaceholder')}</Label>
                <Input value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit">{t('common.save')}</Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-3">
          {experiences.map((exp) => (
            <Card key={exp.id} size="sm">
              <CardContent className="flex justify-between gap-4 pt-4">
                <div className="space-y-2">
                  <Badge variant="secondary">{t(`experienceType.${exp.type}`, { defaultValue: exp.type })}</Badge>
                  <h3 className="font-medium">{exp.title}</h3>
                  <p className="text-sm text-muted-foreground">{exp.description}</p>
                  {exp.result && (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                      {t('experiences.resultLabel')}: {exp.result}
                    </p>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="text-destructive shrink-0" onClick={() => deleteMutation.mutate(exp.id)}>
                  {t('common.delete')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
