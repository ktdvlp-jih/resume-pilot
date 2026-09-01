import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { GitHubIcon, NotionIcon, ObsidianIcon } from '@/components/common/brand-icons';
import { api } from '@/lib/api';
import { GitHubConnectPanel } from '@/components/experience/github-connect-panel';
import { NotionConnectPanel } from '@/components/experience/notion-connect-panel';
import { ObsidianImportPanel } from '@/components/experience/obsidian-import-panel';
import { PageHeader } from '@/components/common/page-header';
import { PageShell } from '@/components/common/page-shell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Draft = {
  sourceKey: string;
  type: string;
  title: string;
  description: string;
  role?: string | null;
  skills?: string[];
};

function applyDrafts(data: Draft[], setDrafts: (d: Draft[]) => void, setSelected: (s: Record<string, boolean>) => void) {
  setDrafts(data);
  setSelected(Object.fromEntries(data.map((d) => [d.sourceKey, true])));
}

export default function ExperienceImportPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const returnTo = searchParams.get('return') || '/experiences';
  const [pageRef, setPageRef] = useState('');
  const [repoFullName, setRepoFullName] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const statusQuery = useQuery({
    queryKey: ['experience-import-integrations'],
    queryFn: api.listExperienceImportIntegrations,
  });

  const notionStatus = statusQuery.data?.find((s) => s.provider === 'NOTION');
  const githubStatus = statusQuery.data?.find((s) => s.provider === 'GITHUB');

  useEffect(() => {
    const notionResult = searchParams.get('notion');
    const githubResult = searchParams.get('github');
    if (notionResult) {
      if (notionResult === 'connected') {
        const workspace = searchParams.get('workspace');
        toast.success(
          workspace
            ? t('experienceImport.notionOAuthOkWorkspace', { workspace })
            : t('experienceImport.notionOAuthOk'),
        );
        queryClient.invalidateQueries({ queryKey: ['experience-import-integrations'] });
      } else if (notionResult === 'error') {
        toast.error(searchParams.get('message') || t('experienceImport.notionOAuthFailed'));
      }
      searchParams.delete('notion');
      searchParams.delete('workspace');
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
      searchParams.delete('github');
      searchParams.delete('login');
    }
    if (notionResult || githubResult) {
      searchParams.delete('message');
      setSearchParams(searchParams, { replace: true });
    }
  }, [queryClient, searchParams, setSearchParams, t]);

  const previewNotion = useMutation({
    mutationFn: () =>
      api.previewNotionImport({
        pageId: pageRef.trim() || undefined,
        pageUrl: pageRef.includes('http') ? pageRef.trim() : undefined,
      }),
    onSuccess: (data) => {
      applyDrafts(data, setDrafts, setSelected);
      toast.success(t('experienceImport.previewReady', { count: data.length }));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const previewGithub = useMutation({
    mutationFn: () =>
      api.previewGitHubImport({
        repoFullName: repoFullName.trim() || undefined,
      }),
    onSuccess: (data) => {
      applyDrafts(data, setDrafts, setSelected);
      toast.success(t('experienceImport.previewReady', { count: data.length }));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const previewMarkdown = useMutation({
    mutationFn: (files: Array<{ filename: string; content: string }>) => api.previewMarkdownImport(files),
    onSuccess: (data) => {
      applyDrafts(data, setDrafts, setSelected);
      toast.success(t('experienceImport.previewReady', { count: data.length }));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const confirm = useMutation({
    mutationFn: () => {
      const picked = drafts.filter((d) => selected[d.sourceKey]);
      return api.confirmExperienceImport(
        picked.map((d) => ({
          type: d.type || 'PROJECT',
          title: d.title,
          description: d.description,
          role: d.role || '미기재',
          skills: d.skills ?? [],
        })),
      );
    },
    onSuccess: (created) => {
      toast.success(t('experienceImport.confirmDone', { count: created.length }));
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      setDrafts([]);
      setSelected({});
      navigate(returnTo);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedCount = useMemo(
    () => drafts.filter((d) => selected[d.sourceKey]).length,
    [drafts, selected],
  );

  const previewing = previewNotion.isPending || previewGithub.isPending || previewMarkdown.isPending;

  return (
    <PageShell>
      <PageHeader
        title={t('experienceImport.title')}
        description={t('experienceImport.desc')}
        action={
          <Button variant="outline" asChild>
            <Link to={returnTo}>
              <ArrowLeft className="size-4" aria-hidden />
              {returnTo === '/onboarding' ? t('onboardingFlow.title') : t('experienceImport.back')}
            </Link>
          </Button>
        }
      />

      <Alert>
        <AlertDescription>{t('experienceImport.noInvent')}</AlertDescription>
      </Alert>

      <Tabs defaultValue="notion" className="w-full">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="notion" className="gap-2">
            <NotionIcon className="size-4 shrink-0" />
            {t('experienceImport.notion')}
          </TabsTrigger>
          <TabsTrigger value="github" className="gap-2">
            <GitHubIcon className="size-4 shrink-0" />
            {t('experienceImport.github')}
          </TabsTrigger>
          <TabsTrigger value="obsidian" className="gap-2">
            <ObsidianIcon className="size-4 shrink-0" />
            {t('experienceImport.obsidian')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notion" className="space-y-4">
          <NotionConnectPanel
            configured={!!notionStatus?.configured}
            maskedToken={notionStatus?.accessTokenMasked}
            onTokenSaved={() =>
              queryClient.invalidateQueries({ queryKey: ['experience-import-integrations'] })
            }
          />
          {notionStatus?.configured && (
            <Card>
              <CardHeader>
                <CardTitle>{t('experienceImport.previewTitle')}</CardTitle>
                <CardDescription>{t('experienceImport.notionPreviewHint')}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="notion-page">{t('experienceImport.pageRef')}</Label>
                  <Input
                    id="notion-page"
                    value={pageRef}
                    onChange={(e) => setPageRef(e.target.value)}
                    placeholder={t('experienceImport.pageRefPlaceholder')}
                  />
                </div>
                <Button type="button" disabled={previewing} onClick={() => previewNotion.mutate()}>
                  {previewNotion.isPending ? <Loader2 className="size-4 animate-spin" /> : t('experienceImport.preview')}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="github" className="space-y-4">
          <GitHubConnectPanel
            configured={!!githubStatus?.configured}
            maskedToken={githubStatus?.accessTokenMasked}
            externalLogin={githubStatus?.externalUserId}
            onTokenSaved={() =>
              queryClient.invalidateQueries({ queryKey: ['experience-import-integrations'] })
            }
          />
          {githubStatus?.configured && (
            <Card>
              <CardHeader>
                <CardTitle>{t('experienceImport.previewTitle')}</CardTitle>
                <CardDescription>{t('experienceImport.githubPreviewHint')}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="github-repo">{t('experienceImport.repo')}</Label>
                  <Input
                    id="github-repo"
                    value={repoFullName}
                    onChange={(e) => setRepoFullName(e.target.value)}
                    placeholder="owner/repo"
                  />
                </div>
                <Button type="button" disabled={previewing} onClick={() => previewGithub.mutate()}>
                  {previewGithub.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    t('experienceImport.preview')
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="obsidian" className="space-y-4">
          <ObsidianImportPanel
            previewing={previewMarkdown.isPending}
            onPreview={async (files) => {
              await previewMarkdown.mutateAsync(files);
            }}
          />
        </TabsContent>
      </Tabs>

      {drafts.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <div>
              <CardTitle>{t('experienceImport.draftsTitle')}</CardTitle>
              <CardDescription>{t('experienceImport.draftsDesc')}</CardDescription>
            </div>
            <Button
              type="button"
              disabled={selectedCount === 0 || confirm.isPending}
              onClick={() => confirm.mutate()}
            >
              {confirm.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                t('experienceImport.confirm', { count: selectedCount })
              )}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {drafts.map((d) => (
              <label
                key={d.sourceKey}
                className="flex cursor-pointer gap-3 rounded-lg border p-3 hover:bg-muted/40"
              >
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-primary"
                  checked={!!selected[d.sourceKey]}
                  onChange={(e) =>
                    setSelected((prev) => ({ ...prev, [d.sourceKey]: e.target.checked }))
                  }
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium">{d.title}</p>
                  <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                    {d.description}
                  </p>
                  {(d.skills?.length ?? 0) > 0 && (
                    <p className="text-xs text-muted-foreground">{d.skills?.join(', ')}</p>
                  )}
                </div>
              </label>
            ))}
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
