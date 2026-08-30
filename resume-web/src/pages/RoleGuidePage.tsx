import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/common/page-header';
import { PageShell } from '@/components/common/page-shell';
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

export default function RoleGuidePage() {
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
    <PageShell size="lg">
      <PageHeader title={t('roleGuide.title')} description={t('roleGuide.description')} />
      <Tabs
        value={role}
        onValueChange={(next) => {
          if (!isRoleGuideId(next)) return;
          setParams({ role: next }, { replace: true });
        }}
      >
        <TabsList className="flex h-auto min-h-8 w-full max-w-3xl flex-wrap justify-start">
          {ROLE_GUIDE_IDS.map((id) => (
            <TabsTrigger key={id} value={id}>
              {t(`roleGuide.roleName.${id}`)}
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
          <AlertDescription>{t('roleGuide.unavailable', { role: t(`roleGuide.roleName.${role}`) })}</AlertDescription>
        </Alert>
      )}
    </PageShell>
  );
}
