import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type DeployCiSettings = {
  deployAiE2eEnabled: boolean;
  deployE2eEnabled: boolean;
  updatedAt?: string;
};

export default function DeployCiSettingsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-deploy-ci-settings'],
    queryFn: api.getDeployCiSettings,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: api.updateDeployCiSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deploy-ci-settings'] });
    },
  });

  const settings = data as DeployCiSettings | undefined;
  const dateLocale = i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'ja' ? 'ja-JP' : i18n.language === 'zh' ? 'zh-CN' : 'en-US';

  const toggleAi = (enabled: boolean) => {
    mutation.mutate({
      deployAiE2eEnabled: enabled,
      deployE2eEnabled: settings?.deployE2eEnabled ?? true,
    });
  };

  const toggleE2e = (enabled: boolean) => {
    mutation.mutate({
      deployAiE2eEnabled: settings?.deployAiE2eEnabled ?? true,
      deployE2eEnabled: enabled,
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t('deploySettings.title')} description={t('deploySettings.subtitle')} />

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {error instanceof Error ? error.message : t('deploySettings.loadError')}
          </AlertDescription>
        </Alert>
      )}

      {mutation.isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {mutation.error instanceof Error ? mutation.error.message : t('deploySettings.saveError')}
          </AlertDescription>
        </Alert>
      )}

      {settings?.updatedAt && (
        <p className="text-sm text-muted-foreground">
          {t('deploySettings.lastUpdated')}: {new Date(settings.updatedAt).toLocaleString(dateLocale)}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <SettingCard
          title={t('deploySettings.aiE2eTitle')}
          description={t('deploySettings.aiE2eDesc')}
          enabled={settings?.deployAiE2eEnabled ?? true}
          loading={isLoading || mutation.isPending || isError}
          onToggle={toggleAi}
          enabledLabel={t('deploySettings.enabled')}
          disabledLabel={t('deploySettings.disabled')}
        />
        <SettingCard
          title={t('deploySettings.e2eTitle')}
          description={t('deploySettings.e2eDesc')}
          enabled={settings?.deployE2eEnabled ?? true}
          loading={isLoading || mutation.isPending || isError}
          onToggle={toggleE2e}
          enabledLabel={t('deploySettings.enabled')}
          disabledLabel={t('deploySettings.disabled')}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('deploySettings.noteTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{t('deploySettings.note1')}</p>
          <p>{t('deploySettings.note2')}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingCard({
  title,
  description,
  enabled,
  loading,
  onToggle,
  enabledLabel,
  disabledLabel,
}: {
  title: string;
  description: string;
  enabled: boolean;
  loading: boolean;
  onToggle: (enabled: boolean) => void;
  enabledLabel: string;
  disabledLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant={enabled ? 'default' : 'secondary'}>{enabled ? enabledLabel : disabledLabel}</Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor={`toggle-${title}`} className="text-sm text-muted-foreground">
            {enabled ? enabledLabel : disabledLabel}
          </Label>
          <Switch
            id={`toggle-${title}`}
            checked={enabled}
            disabled={loading}
            onCheckedChange={onToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
}
