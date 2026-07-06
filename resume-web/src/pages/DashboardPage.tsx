import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { CareerPortfolioOverview } from '@/components/career/CareerPortfolioOverview';
import { normalizeCareerPortfolio } from '@/lib/career-portfolio';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: api.getMe });
  const { data: resumes = [], isLoading } = useQuery({ queryKey: ['resumes'], queryFn: api.listResumes });

  const deleteMutation = useMutation({
    mutationFn: api.deleteResume,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resumes'] }),
  });

  const portfolio = normalizeCareerPortfolio(user?.careerPortfolio);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : resumes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">{t('dashboard.empty')}</p>
            <Button variant="link" asChild className="mt-2">
              <Link to="/workspace">{t('dashboard.startWorkspace')}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resumes.map((r) => (
            <Card key={r.id} size="sm">
              <CardHeader>
                <CardTitle>{r.title}</CardTitle>
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
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-destructive"
                  onClick={() => deleteMutation.mutate(r.id)}
                >
                  {t('common.delete')}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
