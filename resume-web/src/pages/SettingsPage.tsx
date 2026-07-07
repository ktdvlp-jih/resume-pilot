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
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

export default function SettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('portfolio');
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: api.getMe });
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [portfolio, setPortfolio] = useState<CareerPortfolio>(normalizeCareerPortfolio());
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setBio(user.bio || '');
      setPortfolio(normalizeCareerPortfolio(user.careerPortfolio));
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: () => api.updateMe({ name, phone, bio, careerPortfolio: portfolio }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success(t('settings.profileSaved'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const passwordMutation = useMutation({
    mutationFn: () => api.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success(t('settings.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t('settings.passwordChangeFailed')),
  });

  const pct = portfolioCompletion(portfolio);

  return (
    <PageShell size="md">
      <PageHeader title={t('settings.myPage')} description={t('settings.myPageSubtitle')} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="portfolio" className="flex-1">
            {t('portfolio.tab')} · {pct}%
          </TabsTrigger>
          <TabsTrigger value="account" className="flex-1">
            {t('settings.accountTab')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="mt-6 space-y-6">
          <Section title={t('portfolio.tab')} description={t('settings.portfolioSectionDesc')}>
            <CareerPortfolioEditor value={portfolio} onChange={setPortfolio} />
          </Section>
          <Button size="lg" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? t('common.loading') : t('portfolio.saveAll')}
          </Button>
        </TabsContent>

        <TabsContent value="account" className="mt-6 space-y-6">
          <Section title={t('settings.profile')} description={t('settings.profileSectionDesc')}>
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">{t('auth.email')}</Label>
                  <p className="text-sm font-medium">{user?.email}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">{t('auth.name')}</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('settings.phone')}</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">{t('settings.bio')}</Label>
                  <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
                </div>
                <Button variant="secondary" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                  {t('common.save')}
                </Button>
              </CardContent>
            </Card>
          </Section>

          <Section title={t('settings.changePassword')} description={t('settings.passwordSectionDesc')}>
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="current-password">{t('settings.currentPassword')}</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">{t('settings.newPassword')}</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <Button
                  variant="secondary"
                  onClick={() => passwordMutation.mutate()}
                  disabled={!currentPassword || !newPassword || passwordMutation.isPending}
                >
                  {t('settings.change')}
                </Button>
              </CardContent>
            </Card>
          </Section>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
