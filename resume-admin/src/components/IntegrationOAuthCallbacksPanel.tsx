import { Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OAUTH_REDIRECT_TEMPLATES } from '@/lib/oauth-redirect-templates';

type OAuthCallbackRowProps = {
  label: string;
  template: string;
  resolved: string;
};

async function copyText(value: string, okMessage: string, errMessage: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(okMessage);
  } catch {
    toast.error(errMessage);
  }
}

function OAuthCallbackRow({ label, template, resolved }: OAuthCallbackRowProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2 rounded-lg border border-dashed p-3">
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{t('integrationSettings.oauthTemplateLabel')}</p>
        <div className="flex gap-2">
          <Input readOnly value={template} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
          <Button
            type="button"
            size="icon"
            variant="outline"
            title={t('integrationSettings.copyTemplate')}
            aria-label={t('integrationSettings.copyTemplate')}
            onClick={() =>
              copyText(template, t('integrationSettings.copiedTemplate'), t('integrationSettings.copyFailed'))
            }
          >
            <Copy className="size-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{t('integrationSettings.oauthResolvedLabel')}</p>
        <div className="flex gap-2">
          <Input readOnly value={resolved} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
          <Button
            type="button"
            size="icon"
            variant="outline"
            title={t('integrationSettings.copyResolved')}
            aria-label={t('integrationSettings.copyResolved')}
            onClick={() =>
              copyText(resolved, t('integrationSettings.copiedResolved'), t('integrationSettings.copyFailed'))
            }
          >
            <Copy className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function IntegrationOAuthCallbacksPanel({
  hints,
}: {
  hints: {
    notionRedirectUri: string;
    githubRedirectUri: string;
    notionRedirectTemplate?: string;
    githubRedirectTemplate?: string;
  };
}) {
  const { t } = useTranslation();
  const notionTemplate = hints.notionRedirectTemplate || OAUTH_REDIRECT_TEMPLATES.notion;
  const githubTemplate = hints.githubRedirectTemplate || OAUTH_REDIRECT_TEMPLATES.github;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <OAuthCallbackRow
        label={t('integrationSettings.notionName')}
        template={notionTemplate}
        resolved={hints.notionRedirectUri}
      />
      <OAuthCallbackRow
        label={t('integrationSettings.githubName')}
        template={githubTemplate}
        resolved={hints.githubRedirectUri}
      />
    </div>
  );
}
