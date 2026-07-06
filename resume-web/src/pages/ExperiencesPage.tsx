import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { EXPERIENCE_TYPES } from '@/i18n';
import { PageHeader } from '@/components/common/page-header';
import { PageShell } from '@/components/common/page-shell';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-state';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
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
      toast.success(t('common.saved'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteExperience,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      toast.success(t('common.deleted'));
    },
    onError: () => toast.error(t('common.error')),
  });

  return (
    <PageShell size="lg">
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
                <Label>{t('experiences.typeLabel', { defaultValue: 'Type' })}</Label>
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
              <Button type="submit" disabled={createMutation.isPending}>
                {t('common.save')}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {isLoading ? (
        <LoadingSpinner label={t('common.loading')} />
      ) : experiences.length === 0 ? (
        <EmptyState
          title={t('experiences.empty', { defaultValue: t('dashboard.empty') })}
          action={
            <Button onClick={() => setShowForm(true)}>{t('experiences.add')}</Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {experiences.map((exp) => (
            <Card key={exp.id} className="transition-shadow hover:shadow-sm">
              <CardContent className="flex justify-between gap-4 pt-4">
                <div className="space-y-2">
                  <Badge variant="secondary">{t(`experienceType.${exp.type}`, { defaultValue: exp.type })}</Badge>
                  <h3 className="font-medium">{exp.title}</h3>
                  <p className="text-sm text-muted-foreground">{exp.description}</p>
                  {exp.result && (
                    <p className="text-sm text-success">
                      {t('experiences.resultLabel')}: {exp.result}
                    </p>
                  )}
                </div>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="sm" className="shrink-0 text-destructive">
                      {t('common.delete')}
                    </Button>
                  }
                  title={t('common.confirmDelete')}
                  description={t('common.confirmDeleteDesc')}
                  confirmLabel={t('common.delete')}
                  cancelLabel={t('common.cancel')}
                  destructive
                  onConfirm={() => deleteMutation.mutate(exp.id)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
