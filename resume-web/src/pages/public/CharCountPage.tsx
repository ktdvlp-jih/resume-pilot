import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PublicPage } from '@/components/layout/public-page';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { countChars } from '@/lib/resume-export';
import { getAccessToken } from '@/lib/api';

export default function CharCountPage() {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const counts = useMemo(() => countChars(text), [text]);
  const loggedIn = !!getAccessToken();

  return (
    <PublicPage title={t('tools.char.title')} description={t('tools.char.desc')} path="/tools/char-count">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('tools.char.title')}</h1>
        <p className="text-pretty text-muted-foreground">{t('tools.char.desc')}</p>
      </header>
      <div className="flex flex-col gap-2">
        <Label htmlFor="char-count-input">{t('tools.char.input')}</Label>
        <Textarea
          id="char-count-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          spellCheck
          placeholder={t('tools.char.placeholder')}
        />
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <dt className="text-sm text-muted-foreground">{t('tools.char.withSpaces')}</dt>
          <dd className="text-2xl font-semibold tabular-nums">{counts.withSpaces}</dd>
        </div>
        <div className="rounded-lg border p-4">
          <dt className="text-sm text-muted-foreground">{t('tools.char.withoutSpaces')}</dt>
          <dd className="text-2xl font-semibold tabular-nums">{counts.withoutSpaces}</dd>
        </div>
        <div className="rounded-lg border p-4">
          <dt className="text-sm text-muted-foreground">{t('tools.char.bytes')}</dt>
          <dd className="text-2xl font-semibold tabular-nums">{counts.bytes}</dd>
        </div>
      </dl>
      <p className="text-sm text-muted-foreground">
        {loggedIn ? (
          <Link to="/workspace" className="text-primary underline-offset-4 hover:underline">
            {t('tools.saveInApp')}
          </Link>
        ) : (
          <Link to="/signup" className="text-primary underline-offset-4 hover:underline">
            {t('tools.signupToSave')}
          </Link>
        )}
      </p>
    </PublicPage>
  );
}
