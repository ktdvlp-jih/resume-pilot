import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PublicPage } from '@/components/layout/public-page';

const LEGAL_PATHS = ['/about', '/privacy', '/terms', '/contact'] as const;
type LegalPath = (typeof LEGAL_PATHS)[number];

function isLegalPath(path: string): path is LegalPath {
  return (LEGAL_PATHS as readonly string[]).includes(path);
}

export default function LegalPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const path = isLegalPath(location.pathname) ? location.pathname : '/about';
  const key = path.slice(1);
  const contactEmail = (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim();
  const paragraphs = t(`legal.${key}.body`, { returnObjects: true });
  const body = Array.isArray(paragraphs) ? paragraphs.filter((p): p is string => typeof p === 'string') : [];

  return (
    <PublicPage
      title={t(`legal.${key}.title`)}
      description={t(`legal.${key}.desc`)}
      path={path}
    >
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t(`legal.${key}.title`)}</h1>
        <p className="text-sm text-muted-foreground">{t('legal.updated')}</p>
      </header>
      <div className="flex flex-col gap-4 text-sm leading-relaxed">
        {body.map((p) => (
          <p key={p} className="text-pretty break-keep">
            {p}
          </p>
        ))}
        {path === '/contact' && contactEmail && (
          <p>
            <a className="text-primary underline-offset-4 hover:underline" href={`mailto:${contactEmail}`}>
              {contactEmail}
            </a>
          </p>
        )}
        {path === '/contact' && !contactEmail && (
          <p className="text-muted-foreground">{t('legal.contact.noEmail')}</p>
        )}
      </div>
      <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground" aria-label={t('legal.nav')}>
        {LEGAL_PATHS.map((href) => (
          <Link key={href} to={href} className="hover:text-foreground">
            {t(`legal.${href.slice(1)}.title`)}
          </Link>
        ))}
      </nav>
    </PublicPage>
  );
}
