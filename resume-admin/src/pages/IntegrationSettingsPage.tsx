import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleHelp, Copy, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { IntegrationOAuthCallbacksPanel } from '@/components/IntegrationOAuthCallbacksPanel';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Setting = {
  key: string;
  category: string;
  secret: boolean;
  configured: boolean;
  displayValue: string;
};

type ProviderDef = {
  id: string;
  displayNameKey: string;
  slug: string;
  keys: string[];
};

const PG_PROVIDERS: ProviderDef[] = [
  {
    id: 'toss',
    displayNameKey: 'integrationSettings.tossName',
    slug: 'toss-payments',
    keys: ['TOSS_PAYMENTS_CLIENT_KEY', 'TOSS_PAYMENTS_SECRET_KEY'],
  },
];

const IMPORT_PROVIDERS: ProviderDef[] = [
  {
    id: 'notion',
    displayNameKey: 'integrationSettings.notionName',
    slug: 'notion',
    keys: ['NOTION_CLIENT_ID', 'NOTION_CLIENT_SECRET', 'NOTION_OAUTH_REDIRECT_URI'],
  },
  {
    id: 'github',
    displayNameKey: 'integrationSettings.githubName',
    slug: 'github',
    keys: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_OAUTH_REDIRECT_URI'],
  },
];

const FIELD_LABEL_KEYS: Record<string, string> = {
  TOSS_PAYMENTS_CLIENT_KEY: 'integrationSettings.fields.clientKey',
  TOSS_PAYMENTS_SECRET_KEY: 'integrationSettings.fields.secretKey',
  NOTION_CLIENT_ID: 'integrationSettings.fields.clientId',
  NOTION_CLIENT_SECRET: 'integrationSettings.fields.clientSecret',
  NOTION_OAUTH_REDIRECT_URI: 'integrationSettings.fields.redirectUri',
  GITHUB_CLIENT_ID: 'integrationSettings.fields.clientId',
  GITHUB_CLIENT_SECRET: 'integrationSettings.fields.clientSecret',
  GITHUB_OAUTH_REDIRECT_URI: 'integrationSettings.fields.redirectUri',
};

function providerHasPendingEdits(provider: ProviderDef, itemsByKey: Map<string, Setting>, edits: Record<string, string>) {
  return provider.keys.some((key) => {
    const item = itemsByKey.get(key);
    if (!item) return (edits[key] ?? '').trim().length > 0;
    if (edits[key] === undefined) return false;
    if (item.secret) return edits[key].trim().length > 0;
    return edits[key] !== item.displayValue;
  });
}

function IntegrationProviderCard({
  provider,
  itemsByKey,
  edits,
  revealingKey,
  onEditChange,
  onReveal,
  onSave,
  saving,
}: {
  provider: ProviderDef;
  itemsByKey: Map<string, Setting>;
  edits: Record<string, string>;
  revealingKey: string | null;
  onEditChange: (key: string, value: string) => void;
  onReveal: (item: Setting) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const { t } = useTranslation();
  const items = provider.keys.map((key) => itemsByKey.get(key)).filter(Boolean) as Setting[];
  const allConfigured = items.length > 0 && items.every((item) => item.configured);
  const hasPendingEdits = providerHasPendingEdits(provider, itemsByKey, edits);

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm">{t(provider.displayNameKey)}</CardTitle>
            <CardDescription className="font-mono text-xs">{provider.slug}</CardDescription>
          </div>
          <Badge variant={allConfigured ? 'default' : 'secondary'}>
            {allConfigured ? t('integrationSettings.configured') : t('integrationSettings.notConfigured')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.key} className="space-y-1">
            <Label htmlFor={item.key}>{t(FIELD_LABEL_KEYS[item.key] ?? item.key)}</Label>
            <div className="flex gap-2">
              <Input
                id={item.key}
                type={item.secret ? 'password' : 'text'}
                className="min-w-0 flex-1"
                placeholder={
                  item.secret
                    ? item.configured
                      ? item.displayValue
                      : t('integrationSettings.secretPlaceholder')
                    : item.key.endsWith('_REDIRECT_URI')
                      ? t('integrationSettings.redirectUriPlaceholder')
                      : t('integrationSettings.valuePlaceholder')
                }
                value={
                  item.secret
                    ? (edits[item.key] ?? '')
                    : (edits[item.key] ?? item.displayValue)
                }
                onChange={(e) => onEditChange(item.key, e.target.value)}
              />
              {item.secret && item.configured && (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  title={t('llmSettings.revealKey')}
                  aria-label={t('llmSettings.revealKey')}
                  disabled={revealingKey === item.key}
                  onClick={() => onReveal(item)}
                >
                  <Eye className="size-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
        <Button size="sm" variant="outline" disabled={saving || !hasPendingEdits} onClick={onSave}>
          {t('integrationSettings.saveKeys')}
        </Button>
      </CardContent>
    </Card>
  );
}

function IntegrationSection({
  title,
  description,
  headerAction,
  providers,
  itemsByKey,
  edits,
  revealingKey,
  onEditChange,
  onReveal,
  onSaveProvider,
  savingProviderId,
  isLoading,
}: {
  title: string;
  description: string;
  headerAction?: ReactNode;
  providers: ProviderDef[];
  itemsByKey: Map<string, Setting>;
  edits: Record<string, string>;
  revealingKey: string | null;
  onEditChange: (key: string, value: string) => void;
  onReveal: (item: Setting) => void;
  onSaveProvider: (provider: ProviderDef) => void;
  savingProviderId: string | null;
  isLoading: boolean;
}) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {headerAction}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : (
          providers.map((provider) => (
            <IntegrationProviderCard
              key={provider.id}
              provider={provider}
              itemsByKey={itemsByKey}
              edits={edits}
              revealingKey={revealingKey}
              onEditChange={onEditChange}
              onReveal={onReveal}
              onSave={() => onSaveProvider(provider)}
              saving={savingProviderId === provider.id}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function IntegrationSettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [savingProviderId, setSavingProviderId] = useState<string | null>(null);
  const [revealingKey, setRevealingKey] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<{ key: string; label: string; value: string } | null>(null);
  const [oauthHelpOpen, setOauthHelpOpen] = useState(false);

  const query = useQuery({
    queryKey: ['admin-integration-settings'],
    queryFn: api.listIntegrationSettings,
    retry: false,
  });

  const oauthHintsQuery = useQuery({
    queryKey: ['admin-integration-oauth-hints'],
    queryFn: api.getIntegrationOAuthHints,
    retry: false,
    enabled: oauthHelpOpen,
  });

  const items = (query.data ?? []) as Setting[];
  const itemsByKey = useMemo(() => new Map(items.map((item) => [item.key, item])), [items]);

  const buildPayload = (provider: ProviderDef) =>
    provider.keys.map((key) => {
      const item = itemsByKey.get(key);
      const edit = edits[key];
      if (edit === undefined) {
        if (item?.secret && item.configured) {
          return { key, value: item.displayValue };
        }
        return { key, value: item?.displayValue ?? '' };
      }
      if (item?.secret && !edit.trim() && item.configured) {
        return { key, value: item.displayValue };
      }
      return { key, value: edit };
    });

  const mutation = useMutation({
    mutationFn: ({ provider, payload }: { provider: ProviderDef; payload: ReturnType<typeof buildPayload> }) =>
      api.updateIntegrationSettings(payload).then((data) => ({ provider, data })),
    onSuccess: ({ provider }) => {
      setEdits((prev) => {
        const next = { ...prev };
        provider.keys.forEach((k) => delete next[k]);
        return next;
      });
      toast.success(t('integrationSettings.saveSuccess'));
      queryClient.invalidateQueries({ queryKey: ['admin-integration-settings'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t('integrationSettings.saveError'));
    },
    onSettled: () => setSavingProviderId(null),
  });

  const saveProvider = (provider: ProviderDef) => {
    setSavingProviderId(provider.id);
    mutation.mutate({ provider, payload: buildPayload(provider) });
  };

  const revealSettingKey = async (item: Setting) => {
    setRevealingKey(item.key);
    try {
      const result = await api.revealIntegrationSettingKey(item.key);
      setRevealedKey({
        key: result.key,
        label: t(FIELD_LABEL_KEYS[item.key] ?? item.key),
        value: result.value,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('llmSettings.revealKeyError'));
    } finally {
      setRevealingKey(null);
    }
  };

  const copyRevealedKey = async () => {
    if (!revealedKey?.value) return;
    try {
      await navigator.clipboard.writeText(revealedKey.value);
      toast.success(t('llmSettings.copiedKey'));
    } catch {
      toast.error(t('llmSettings.revealKeyError'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('integrationSettings.title')} description={t('integrationSettings.desc')} />

      {query.isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {query.error instanceof Error ? query.error.message : t('integrationSettings.loadError')}
          </AlertDescription>
        </Alert>
      )}

      <IntegrationSection
        title={t('integrationSettings.pgTitle')}
        description={t('integrationSettings.pgDesc')}
        providers={PG_PROVIDERS}
        itemsByKey={itemsByKey}
        edits={edits}
        revealingKey={revealingKey}
        onEditChange={(key, value) => setEdits((prev) => ({ ...prev, [key]: value }))}
        onReveal={revealSettingKey}
        onSaveProvider={saveProvider}
        savingProviderId={savingProviderId}
        isLoading={query.isLoading}
      />

      <IntegrationSection
        title={t('integrationSettings.importTitle')}
        description={t('integrationSettings.importDesc')}
        headerAction={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
            title={t('integrationSettings.oauthCallbacksHelp')}
            aria-label={t('integrationSettings.oauthCallbacksHelp')}
            onClick={() => setOauthHelpOpen(true)}
          >
            <CircleHelp className="size-4" />
          </Button>
        }
        providers={IMPORT_PROVIDERS}
        itemsByKey={itemsByKey}
        edits={edits}
        revealingKey={revealingKey}
        onEditChange={(key, value) => setEdits((prev) => ({ ...prev, [key]: value }))}
        onReveal={revealSettingKey}
        onSaveProvider={saveProvider}
        savingProviderId={savingProviderId}
        isLoading={query.isLoading}
      />

      <Dialog open={oauthHelpOpen} onOpenChange={setOauthHelpOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('integrationSettings.oauthCallbacksTitle')}</DialogTitle>
            <DialogDescription>{t('integrationSettings.oauthCallbacksDesc')}</DialogDescription>
          </DialogHeader>
          {oauthHintsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : oauthHintsQuery.isError ? (
            <p className="text-sm text-destructive">
              {oauthHintsQuery.error instanceof Error
                ? oauthHintsQuery.error.message
                : t('integrationSettings.loadError')}
            </p>
          ) : oauthHintsQuery.data ? (
            <IntegrationOAuthCallbacksPanel hints={oauthHintsQuery.data} />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={revealedKey !== null} onOpenChange={(open) => !open && setRevealedKey(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('llmSettings.revealKeyTitle')}</DialogTitle>
            <DialogDescription>
              {revealedKey
                ? t('integrationSettings.revealKeyDesc', { label: revealedKey.label, key: revealedKey.key })
                : t('llmSettings.revealKeyDescGeneric')}
            </DialogDescription>
          </DialogHeader>
          {revealedKey && (
            <div className="space-y-3">
              <Input
                readOnly
                value={revealedKey.value}
                className="font-mono text-xs"
                onFocus={(e) => e.target.select()}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setRevealedKey(null)}>
                  {t('common.cancel')}
                </Button>
                <Button type="button" onClick={copyRevealedKey}>
                  <Copy className="mr-2 size-4" />
                  {t('llmSettings.copyKey')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('integrationSettings.noteTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{t('integrationSettings.note1')}</p>
          <p>{t('integrationSettings.note2')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
