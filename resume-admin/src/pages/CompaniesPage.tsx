import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export default function CompaniesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editId, setEditId] = useState<string | null>(null);
  const [culture, setCulture] = useState('');
  const [keywords, setKeywords] = useState('');

  const { data = [], isLoading } = useQuery({ queryKey: ['admin-companies'], queryFn: api.listCompanies });

  const updateMutation = useMutation({
    mutationFn: (id: string) => api.updateCompany(id, {
      culture,
      hiringKeywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      setEditId(null);
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader title={t('companies.title')} />
      {isLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('companies.name')}</TableHead>
                  <TableHead>{t('companies.culture')}</TableHead>
                  <TableHead>{t('companies.hiringKeywords')}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data as Array<{ id: string; name: string; culture?: string; hiringKeywords: string[] }>).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.culture || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{c.hiringKeywords?.join(', ') || '-'}</TableCell>
                    <TableCell>
                      <Button variant="link" size="sm" className="h-auto p-0" onClick={() => { setEditId(c.id); setCulture(c.culture || ''); setKeywords((c.hiringKeywords || []).join(', ')); }}>
                        {t('common.edit')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {editId && (
        <Card className="max-w-lg">
          <CardHeader><CardTitle>{t('companies.editCompany')}</CardTitle></CardHeader>
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(editId); }}>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>{t('companies.orgCulture')}</Label>
                <Input value={culture} onChange={(e) => setCulture(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('companies.keywordsPlaceholder')}</Label>
                <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} />
              </div>
              <Button type="submit">{t('common.save')}</Button>
            </CardContent>
          </form>
        </Card>
      )}
    </div>
  );
}
