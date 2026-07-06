import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { CareerPortfolioOverview } from '@/components/career/CareerPortfolioOverview';
import { normalizeCareerPortfolio } from '@/lib/career-portfolio';
import { PageHeader } from '@/components/common/page-header';
import { PageShell } from '@/components/common/page-shell';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingCardList } from '@/components/common/loading-state';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: api.getMe });
  const { data: resumes = [], isLoading } = useQuery({ queryKey: ['resumes'], queryFn: api.listResumes });

  const deleteMutation = useMutation({
    mutationFn: api.deleteResume,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      toast.success(t('common.deleted'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const portfolio = normalizeCareerPortfolio(user?.careerPortfolio);

  return (
    <PageShell className="space-y-8">
      <CareerPortfolioOverview name={user?.name} portfolio={portfolio} />

      <PageHeader
        title={t('dashboard.title')}
        action={
          <Button asChild>
            <Link to="/workspace">{t('dashboard.newResume')}</Link>
          </Button>
        }
      />

      {isLoading ? (
        <LoadingCardList />
      ) : resumes.length === 0 ? (
        <EmptyState
          title={t('dashboard.empty')}
          action={
            <Button asChild>
              <Link to="/workspace">{t('dashboard.startWorkspace')}</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resumes.map((r) => (
            <Card key={r.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="line-clamp-1">{r.title}</CardTitle>
                {r.companyName && <p className="text-sm text-primary">{r.companyName}</p>}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {r.latestContent || r.description || t('dashboard.noContent')}
                </p>
              </CardContent>
              <CardFooter className="gap-3">
                <Button variant="link" size="sm" className="h-auto p-0" asChild>
                  <Link to={`/resumes/${r.id}/versions`}>{t('dashboard.versions')}</Link>
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button variant="link" size="sm" className="h-auto p-0 text-destructive">
                      {t('common.delete')}
                    </Button>
                  }
                  title={t('common.confirmDelete')}
                  description={t('common.confirmDeleteDesc')}
                  confirmLabel={t('common.delete')}
                  cancelLabel={t('common.cancel')}
                  destructive
                  onConfirm={() => deleteMutation.mutate(r.id)}
                />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
