import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { CareerPortfolioEditor } from '@/components/career/CareerPortfolioEditor';
import { normalizeCareerPortfolio, portfolioCompletion, type CareerPortfolio } from '@/lib/career-portfolio';
import { PageHeader } from '@/components/common/page-header';
import { PageShell } from '@/components/common/page-shell';
import { Section } from '@/components/common/section';
import { Button } from '@/components/ui/button';

export default function PortfolioPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: api.getMe });
  const [portfolio, setPortfolio] = useState<CareerPortfolio>(normalizeCareerPortfolio());

  useEffect(() => {
    if (user) {
      setPortfolio(normalizeCareerPortfolio(user.careerPortfolio));
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updateMe({
        name: user?.name,
        phone: user?.phone,
        bio: user?.bio,
        careerPortfolio: portfolio,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success(t('settings.profileSaved'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const pct = portfolioCompletion(portfolio);

  return (
    <PageShell>
      <div data-testid="portfolio-page" className="contents">
      <PageHeader
        title={t('portfolio.pageTitle')}
        description={t('portfolio.pageDesc', { pct })}
      />
      <Section title={`${t('portfolio.tab')} · ${pct}%`} description={t('settings.portfolioSectionDesc')}>
        <CareerPortfolioEditor value={portfolio} onChange={setPortfolio} />
      </Section>
      <Button size="lg" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? t('common.loading') : t('portfolio.saveAll')}
      </Button>
      </div>
    </PageShell>
  );
}
