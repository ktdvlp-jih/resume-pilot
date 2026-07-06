import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

export default function ForbiddenPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [expression, setExpression] = useState('');
  const [suggestion, setSuggestion] = useState('');

  const { data = [], isLoading } = useQuery({ queryKey: ['admin-forbidden'], queryFn: api.listForbidden });

  const createMutation = useMutation({
    mutationFn: () => api.createForbidden(expression, suggestion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-forbidden'] });
      setExpression('');
      setSuggestion('');
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t('forbidden.title')} />
      <Card className="max-w-lg">
        <CardHeader><CardTitle>{t('common.add')}</CardTitle></CardHeader>
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>{t('forbidden.expression')}</Label>
              <Input value={expression} onChange={(e) => setExpression(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t('forbidden.suggestion')}</Label>
              <Input value={suggestion} onChange={(e) => setSuggestion(e.target.value)} />
            </div>
            <Button type="submit">{t('common.add')}</Button>
          </CardContent>
        </form>
      </Card>

      {isLoading ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : (
        <ul className="space-y-2">
          {(data as Array<{ id: string; expression: string; suggestion?: string }>).map((f) => (
            <Card key={f.id} size="sm">
              <CardContent className="flex items-center justify-between pt-4">
                <span className="text-sm">
                  {f.expression} {f.suggestion && <span className="text-muted-foreground">→ {f.suggestion}</span>}
                </span>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => api.deleteForbidden(f.id).then(() => queryClient.invalidateQueries({ queryKey: ['admin-forbidden'] }))}>
                  {t('common.delete')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
