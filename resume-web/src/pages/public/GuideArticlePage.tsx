import { Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PublicPage } from '@/components/layout/public-page';
import { RoleGuideMarkdown } from '@/components/role-guide/role-guide-markdown';
import { Card, CardContent } from '@/components/ui/card';
import { isPublicGuideSlug, publicGuideBody } from '@/lib/public-guides';

export default function GuideArticlePage() {
  const { t } = useTranslation();
  const { slug } = useParams();
  if (!isPublicGuideSlug(slug)) {
    return <Navigate to="/guides" replace />;
  }
  const body = publicGuideBody(slug);
  const title = slug === 'star' ? t('guides.starTitle') : t('guides.jobTitle');
  const desc = slug === 'star' ? t('guides.starDesc') : t('guides.jobDesc');

  return (
    <PublicPage title={title} description={desc} path={`/guides/${slug}`}>
      <Card>
        <CardContent>
          {body ? <RoleGuideMarkdown source={body} /> : <p>{t('guides.missing')}</p>}
        </CardContent>
      </Card>
    </PublicPage>
  );
}
