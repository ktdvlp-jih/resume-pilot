import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { BrandIconBadge } from '@/components/common/brand-icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type NotionConnectPanelProps = {
  configured: boolean;
  maskedToken?: string;
  returnPath?: string;
  onTokenSaved?: () => void;
  compact?: boolean;
};

export function NotionConnectPanel({
  configured,
  maskedToken,
  returnPath = '/experiences/import',
  onTokenSaved,
  compact = false,
}: NotionConnectPanelProps) {
  const { t } = useTranslation();
  const [connecting, setConnecting] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  const startOAuth = async () => {
    setConnecting(true);
    try {
      const frontendUrl = window.location.origin;
      const { authorizeUrl } = await api.getNotionOAuthAuthorizeUrl({
        returnPath,
        frontendUrl,
      });
      window.location.assign(authorizeUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('experienceImport.notionOAuthFailed');
      const needsAdmin = message.includes('Client ID') || message.includes('Client Secret');
      toast.error(message, {
        description: needsAdmin ? t('experienceImport.notionOAuthAdminHint') : undefined,
      });
      setConnecting(false);
    }
  };

  const saveManual = async () => {
    if (!manualToken.trim()) return;
    setSavingManual(true);
    try {
      await api.saveNotionImportToken(manualToken.trim());
      toast.success(t('experienceImport.tokenSaved'));
      setManualToken('');
      onTokenSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSavingManual(false);
    }
  };

  if (compact) {
    return (
      <Button type="button" onClick={startOAuth} disabled={connecting}>
        {connecting ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
        {configured ? t('experienceImport.notionReconnect') : t('experienceImport.notionConnect')}
      </Button>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="items-center text-center">
        <BrandIconBadge brand="notion" className="mb-3" />
        <CardTitle>{t('experienceImport.notionConnectTitle')}</CardTitle>
        <CardDescription className="max-w-md">{t('experienceImport.notionConnectDesc')}</CardDescription>
        {configured && maskedToken && (
          <p className="text-xs text-muted-foreground">
            {t('experienceImport.tokenConfigured', { masked: maskedToken })}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 pb-8">
        <Button
          type="button"
          size="lg"
          className="min-w-[220px]"
          onClick={startOAuth}
          disabled={connecting}
        >
          {connecting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t('experienceImport.notionConnecting')}
            </>
          ) : (
            <>
              <Link2 className="size-4" />
              {configured ? t('experienceImport.notionReconnect') : t('experienceImport.notionConnect')}
            </>
          )}
        </Button>

        <div className="w-full max-w-md">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => setManualOpen((v) => !v)}
          >
            {t('experienceImport.notionManual')}
          </Button>
          {manualOpen && (
            <div className="mt-3 space-y-3 rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">{t('experienceImport.tokenHintNotion')}</p>
              <div className="space-y-2">
                <Label htmlFor="notion-manual-token">{t('experienceImport.notionToken')}</Label>
                <Input
                  id="notion-manual-token"
                  type="password"
                  autoComplete="off"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="secret_…"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={!manualToken.trim() || savingManual}
                onClick={saveManual}
              >
                {savingManual ? <Loader2 className="size-4 animate-spin" /> : t('common.save')}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
