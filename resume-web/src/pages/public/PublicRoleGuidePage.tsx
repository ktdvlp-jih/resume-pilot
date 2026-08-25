import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PublicPage } from '@/components/layout/public-page';
import { RoleGuideMarkdown } from '@/components/role-guide/role-guide-markdown';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  defaultRoleGuideId,
  isRoleGuideId,
  ROLE_GUIDE_IDS,
  roleGuideBody,
  type RoleGuideId,
} from '@/lib/role-guides';

export default function PublicRoleGuidePage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const role = useMemo<RoleGuideId>(() => {
    const fromUrl = params.get('role');
    if (isRoleGuideId(fromUrl)) return fromUrl;
    return defaultRoleGuideId();
  }, [params]);
  const body = roleGuideBody(role);

  useEffect(() => {
    if (params.get('role') === role) return;
    setParams({ role }, { replace: true });
  }, [params, role, setParams]);

  return (
    <PublicPage title={t('roleGuide.title')} description={t('roleGuide.description')} path="/guides/roles">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('roleGuide.title')}</h1>
        <p className="text-pretty text-muted-foreground">{t('roleGuide.description')}</p>
      </header>
      <Tabs
        value={role}
        onValueChange={(next) => {
          if (!isRoleGuideId(next)) return;
          setParams({ role: next }, { replace: true });
        }}
      >
        <TabsList className="w-full max-w-md">
          {ROLE_GUIDE_IDS.map((id) => (
            <TabsTrigger key={id} value={id}>
              {id}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {body ? (
        <Card>
          <CardContent>
            <RoleGuideMarkdown source={body} />
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <AlertDescription>{t('roleGuide.unavailable', { role })}</AlertDescription>
        </Alert>
      )}
    </PublicPage>
  );
}
