import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api, type AdminExperience, type AdminExperienceWrite } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const TYPES = [
  'PROJECT',
  'ACHIEVEMENT',
  'COLLABORATION',
  'CONFLICT_RESOLUTION',
  'PROBLEM_SOLVING',
  'LEADERSHIP',
  'TECHNOLOGY',
  'OTHER',
] as const;

const emptyForm = (): AdminExperienceWrite => ({
  type: 'PROJECT',
  title: '',
  description: '',
  role: '',
  contribution: '',
  result: '',
  numericResult: '',
  starSituation: '',
  starTask: '',
  starAction: '',
  starResult: '',
  skills: [],
  startDate: '',
  endDate: '',
});

function toWrite(row: AdminExperience): AdminExperienceWrite {
  return {
    type: row.type,
    title: row.title,
    description: row.description ?? '',
    role: row.role ?? '',
    contribution: row.contribution ?? '',
    result: row.result ?? '',
    numericResult: row.numericResult ?? '',
    starSituation: row.starSituation ?? '',
    starTask: row.starTask ?? '',
    starAction: row.starAction ?? '',
    starResult: row.starResult ?? '',
    skills: row.skills ?? [],
    startDate: row.startDate ?? '',
    endDate: row.endDate ?? '',
  };
}

function payload(form: AdminExperienceWrite): AdminExperienceWrite {
  const skills = (form.skills ?? []).map((s) => s.trim()).filter(Boolean);
  return {
    ...form,
    description: form.description?.trim() || undefined,
    role: form.role?.trim() || undefined,
    contribution: form.contribution?.trim() || undefined,
    result: form.result?.trim() || undefined,
    numericResult: form.numericResult?.trim() || undefined,
    starSituation: form.starSituation?.trim() || undefined,
    starTask: form.starTask?.trim() || undefined,
    starAction: form.starAction?.trim() || undefined,
    starResult: form.starResult?.trim() || undefined,
    skills,
    startDate: form.startDate?.trim() || null,
    endDate: form.endDate?.trim() || null,
  };
}

export default function UserExperiencesPage() {
  const { t } = useTranslation();
  const { userId = '' } = useParams();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AdminExperienceWrite>(emptyForm());
  const [skillsText, setSkillsText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: user, isError: userMissing } = useQuery({
    queryKey: ['admin-user', userId],
    queryFn: () => api.getUser(userId),
    enabled: !!userId,
  });

  const { data: experiences = [], isLoading, isError: experiencesError } = useQuery({
    queryKey: ['admin-user-experiences', userId],
    queryFn: () => api.listUserExperiences(userId),
    enabled: !!userId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-user-experiences', userId] });

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = payload({ ...form, skills: skillsText.split(',').map((s) => s.trim()).filter(Boolean) });
      if (editingId) return api.updateUserExperience(userId, editingId, body);
      return api.createUserExperience(userId, body);
    },
    onSuccess: () => {
      invalidate();
      setForm(emptyForm());
      setSkillsText('');
      setEditingId(null);
      toast.success(t('users.experienceSaved'));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t('common.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (experienceId: string) => api.deleteUserExperience(userId, experienceId),
    onSuccess: () => {
      invalidate();
      toast.success(t('users.experienceDeleted'));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t('common.error')),
  });

  const startEdit = (row: AdminExperience) => {
    setEditingId(row.id);
    setForm(toWrite(row));
    setSkillsText((row.skills ?? []).join(', '));
  };

  const fields = useMemo(
    () =>
      [
        ['description', 'users.expDescription'],
        ['role', 'users.expRole'],
        ['contribution', 'users.expContribution'],
        ['result', 'users.expResult'],
        ['numericResult', 'users.expNumeric'],
        ['starSituation', 'users.expSituation'],
        ['starTask', 'users.expTask'],
        ['starAction', 'users.expAction'],
        ['starResult', 'users.expStarResult'],
      ] as const,
    [],
  );

  if (userMissing) {
    return <EmptyState title={t('users.experienceMissing')} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('users.experienceTitle')}
        description={user ? `${user.email}${user.name ? ` · ${user.name}` : ''}` : t('common.loading')}
        action={
          <Button variant="outline" asChild>
            <Link to="/users">{t('users.experienceBack')}</Link>
          </Button>
        }
      />

      {experiencesError ? (
        <EmptyState title={t('users.experienceForbidden')} />
      ) : (
        <>
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? t('users.experienceEdit') : t('users.experienceAdd')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="exp-type">{t('users.expType')}</Label>
              <Select value={form.type} onValueChange={(type) => setForm((prev) => ({ ...prev, type }))}>
                <SelectTrigger id="exp-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`users.expTypes.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-title">{t('users.expTitle')}</Label>
              <Input
                id="exp-title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-start">{t('users.expStart')}</Label>
              <Input
                id="exp-start"
                type="date"
                value={form.startDate ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-end">{t('users.expEnd')}</Label>
              <Input
                id="exp-end"
                type="date"
                value={form.endDate ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
          {fields.map(([key, labelKey]) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`exp-${key}`}>{t(labelKey)}</Label>
              <Textarea
                id={`exp-${key}`}
                rows={key === 'description' ? 4 : 2}
                value={(form[key] as string) ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="space-y-2">
            <Label htmlFor="exp-skills">{t('users.expSkills')}</Label>
            <Input
              id="exp-skills"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder={t('users.expSkillsHint')}
            />
          </div>
          <div className="flex gap-2">
            <Button disabled={!form.title.trim() || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {t('common.save')}
            </Button>
            {editingId && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm());
                  setSkillsText('');
                }}
              >
                {t('common.cancel')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : experiences.length === 0 ? (
        <EmptyState title={t('users.experienceEmpty')} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('users.expType')}</TableHead>
              <TableHead>{t('users.expTitle')}</TableHead>
              <TableHead className="text-right">{t('users.action')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {experiences.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{t(`users.expTypes.${row.type}`, { defaultValue: row.type })}</TableCell>
                <TableCell>{row.title}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => startEdit(row)}>
                    {t('common.edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`${t('common.delete')}: ${row.title}`}
                    onClick={() => deleteMutation.mutate(row.id)}
                  >
                    {t('common.delete')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
        </>
      )}
    </div>
  );
}
