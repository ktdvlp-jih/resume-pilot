import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PublicPage } from '@/components/layout/public-page';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function GuidesPage() {
  const { t } = useTranslation();
  const items = [
    { to: '/guides/star', title: t('guides.starTitle'), desc: t('guides.starDesc') },
    { to: '/guides/job-posting', title: t('guides.jobTitle'), desc: t('guides.jobDesc') },
    { to: '/tools/char-count', title: t('tools.char.title'), desc: t('tools.char.desc') },
    { to: '/tools/star', title: t('tools.star.title'), desc: t('tools.star.desc') },
    { to: '/tools/spell', title: t('tools.spell.title'), desc: t('tools.spell.desc') },
    { to: '/calendar', title: t('calendar.title'), desc: t('calendar.desc') },
  ];

  return (
    <PublicPage title={t('guides.title')} description={t('guides.pageDesc')} path="/guides" width="lg">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('guides.title')}</h1>
        <p className="text-pretty text-muted-foreground">{t('guides.pageDesc')}</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <Link key={item.to} to={item.to} className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="h-full transition-colors hover:border-primary/30">
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </PublicPage>
  );
}
