import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type DeployCiSettings = {
  deployAiE2eEnabled: boolean;
  deployE2eEnabled: boolean;
  updatedAt?: string;
};

export default function DeployCiSettingsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-deploy-ci-settings'],
    queryFn: api.getDeployCiSettings,
  });

  const mutation = useMutation({
    mutationFn: api.updateDeployCiSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deploy-ci-settings'] });
    },
  });

  const settings = data as DeployCiSettings | undefined;
  const dateLocale = i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'ja' ? 'ja-JP' : i18n.language === 'zh' ? 'zh-CN' : 'en-US';

  const toggle = (patch: Partial<DeployCiSettings>) => {
    if (!settings) return;
    mutation.mutate({
      deployAiE2eEnabled: patch.deployAiE2eEnabled ?? settings.deployAiE2eEnabled,
      deployE2eEnabled: patch.deployE2eEnabled ?? settings.deployE2eEnabled,
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t('deploySettings.title')} description={t('deploySettings.subtitle')} />

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
          loading={isLoading || mutation.isPending}
          onToggle={() => toggle({ deployAiE2eEnabled: !settings?.deployAiE2eEnabled })}
          enabledLabel={t('deploySettings.enabled')}
          disabledLabel={t('deploySettings.disabled')}
          turnOn={t('deploySettings.turnOn')}
          turnOff={t('deploySettings.turnOff')}
        />
        <SettingCard
          title={t('deploySettings.e2eTitle')}
          description={t('deploySettings.e2eDesc')}
          enabled={settings?.deployE2eEnabled ?? true}
          loading={isLoading || mutation.isPending}
          onToggle={() => toggle({ deployE2eEnabled: !settings?.deployE2eEnabled })}
          enabledLabel={t('deploySettings.enabled')}
          disabledLabel={t('deploySettings.disabled')}
          turnOn={t('deploySettings.turnOn')}
          turnOff={t('deploySettings.turnOff')}
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
  turnOn,
  turnOff,
}: {
  title: string;
  description: string;
  enabled: boolean;
  loading: boolean;
  onToggle: () => void;
  enabledLabel: string;
  disabledLabel: string;
  turnOn: string;
  turnOff: string;
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
        <Button variant={enabled ? 'outline' : 'default'} disabled={loading} onClick={onToggle}>
          {enabled ? turnOff : turnOn}
        </Button>
      </CardContent>
    </Card>
  );
}
