import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { PublicLayout } from '@/components/layout/public-layout';
import { DocumentHead } from '@/components/seo/document-head';
import { Button } from '@/components/ui/button';
import { printPlainText } from '@/lib/resume-export';

export default function SharedResumePage() {
  const { t } = useTranslation();
  const { token } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-shared-resume', token],
    queryFn: () => api.getPublicSharedResume(token!),
    enabled: !!token,
    retry: false,
  });

  const title = data?.title || t('share.fallbackTitle');

  return (
    <PublicLayout>
      <DocumentHead
        title={title}
        description={t('share.metaDesc')}
        path={`/r/${token ?? ''}`}
        noIndex
      />
      <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : isError || !data ? (
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-semibold tracking-tight">{t('share.missingTitle')}</h1>
            <p className="text-muted-foreground">{t('share.missingDesc')}</p>
            <Button asChild>
              <Link to="/">{t('landing.backHome')}</Link>
            </Button>
          </div>
        ) : (
          <article className="flex flex-col gap-6">
            <header className="flex flex-col gap-2">
              <h1 className="text-3xl font-semibold tracking-tight">{data.title}</h1>
              {data.companyName && <p className="text-muted-foreground">{data.companyName}</p>}
              <p className="text-xs text-muted-foreground">
                {t('share.expires', { date: new Date(data.expiresAt).toLocaleString() })}
              </p>
            </header>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => printPlainText(data.title, data.content)}>
                {t('export.printPdf')}
              </Button>
            </div>
            <div className="whitespace-pre-wrap break-keep text-sm leading-relaxed">{data.content}</div>
          </article>
        )}
      </div>
    </PublicLayout>
  );
}
