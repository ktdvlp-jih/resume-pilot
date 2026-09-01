import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import { GitHubConnectPanel } from '@/components/experience/github-connect-panel';
import { NotionConnectPanel } from '@/components/experience/notion-connect-panel';
import { api } from '@/lib/api';
import { normalizeCareerPortfolio } from '@/lib/career-portfolio';
import { BillingPanel } from '@/components/billing/billing-panel';
import { PageHeader } from '@/components/common/page-header';
import { PageShell } from '@/components/common/page-shell';
import { Section } from '@/components/common/section';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

const TABS = ['wallet', 'billing', 'integrations', 'account'] as const;
type SettingsTab = (typeof TABS)[number];

function parseTab(raw: string | null): SettingsTab {
  if (raw && (TABS as readonly string[]).includes(raw)) {
    return raw as SettingsTab;
  }
  return 'wallet';
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTab(searchParams.get('tab'));

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: api.getMe });
  const integrationsQuery = useQuery({
    queryKey: ['experience-import-integrations'],
    queryFn: api.listExperienceImportIntegrations,
  });

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setBio(user.bio || '');
    }
  }, [user]);

  const setTab = (next: string) => {
    const value = parseTab(next);
    setSearchParams(value === 'wallet' ? {} : { tab: value }, { replace: true });
  };

  useEffect(() => {
    if (tab !== 'integrations') return;
    const notionResult = searchParams.get('notion');
    const githubResult = searchParams.get('github');
    if (notionResult) {
      if (notionResult === 'connected') {
        toast.success(t('experienceImport.notionOAuthOk'));
        queryClient.invalidateQueries({ queryKey: ['experience-import-integrations'] });
      } else if (notionResult === 'error') {
        toast.error(searchParams.get('message') || t('experienceImport.notionOAuthFailed'));
      }
    }
    if (githubResult) {
      if (githubResult === 'connected') {
        const login = searchParams.get('login');
        toast.success(
          login
            ? t('experienceImport.githubOAuthOkLogin', { login })
            : t('experienceImport.githubOAuthOk'),
        );
        queryClient.invalidateQueries({ queryKey: ['experience-import-integrations'] });
      } else if (githubResult === 'error') {
        toast.error(searchParams.get('message') || t('experienceImport.githubOAuthFailed'));
      }
    }
    if (!notionResult && !githubResult) return;
    const next = new URLSearchParams(searchParams);
    next.delete('notion');
    next.delete('github');
    next.delete('workspace');
    next.delete('login');
    next.delete('message');
    setSearchParams(next, { replace: true });
  }, [queryClient, searchParams, setSearchParams, t, tab]);

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updateMe({
        name,
        phone,
        bio,
        careerPortfolio: normalizeCareerPortfolio(user?.careerPortfolio),
      }),
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

  const notion = integrationsQuery.data?.find((s) => s.provider === 'NOTION');
  const github = integrationsQuery.data?.find((s) => s.provider === 'GITHUB');

  return (
    <PageShell>
      <div data-testid="settings-page" className="contents">
      <PageHeader title={t('settings.title')} description={t('settings.pageDesc')} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
          <TabsTrigger value="wallet">{t('settings.tabWallet')}</TabsTrigger>
          <TabsTrigger value="billing">{t('settings.tabBilling')}</TabsTrigger>
          <TabsTrigger value="integrations">{t('settings.tabIntegrations')}</TabsTrigger>
          <TabsTrigger value="account">{t('settings.tabAccount')}</TabsTrigger>
        </TabsList>

        <TabsContent value="wallet" className="mt-6">
          <Section title={t('settings.tabWallet')} description={t('settings.walletDesc')}>
            <BillingPanel balanceOnly />
          </Section>
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <Section title={t('settings.tabBilling')} description={t('settings.billingDesc')}>
            <BillingPanel />
          </Section>
        </TabsContent>

        <TabsContent value="integrations" className="mt-6 space-y-4">
          <Section title={t('settings.tabIntegrations')} description={t('settings.integrationsDesc')}>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Notion</CardTitle>
                  <CardDescription>
                    {notion?.configured
                      ? t('settings.integrationConnected', { mask: notion.accessTokenMasked || '****' })
                      : t('settings.integrationNotConnected')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <NotionConnectPanel
                    compact
                    configured={!!notion?.configured}
                    maskedToken={notion?.accessTokenMasked}
                    returnPath="/settings?tab=integrations"
                    onTokenSaved={() =>
                      queryClient.invalidateQueries({ queryKey: ['experience-import-integrations'] })
                    }
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>GitHub</CardTitle>
                  <CardDescription>
                    {github?.configured
                      ? t('settings.integrationConnected', { mask: github.accessTokenMasked || '****' })
                      : t('settings.integrationNotConnected')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <GitHubConnectPanel
                    compact
                    configured={!!github?.configured}
                    maskedToken={github?.accessTokenMasked}
                    externalLogin={github?.externalUserId}
                    returnPath="/settings?tab=integrations"
                    onTokenSaved={() =>
                      queryClient.invalidateQueries({ queryKey: ['experience-import-integrations'] })
                    }
                  />
                </CardContent>
              </Card>
            </div>
            <Button asChild className="mt-2">
              <Link to="/experiences/import">
                {t('settings.openImport')}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Section>
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

          <Section title={t('portfolio.tab')} description={t('settings.portfolioMovedDesc')}>
            <Button variant="outline" asChild>
              <Link to="/portfolio">
                {t('settings.openPortfolio')}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Section>
        </TabsContent>
      </Tabs>
      </div>
    </PageShell>
  );
}
