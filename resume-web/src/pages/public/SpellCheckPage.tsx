import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PublicPage } from '@/components/layout/public-page';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { lintKoreanDraft } from '@/lib/spell-lint';

export default function SpellCheckPage() {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const issues = useMemo(() => lintKoreanDraft(text), [text]);

  return (
    <PublicPage title={t('tools.spell.title')} description={t('tools.spell.desc')} path="/tools/spell">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('tools.spell.title')}</h1>
        <p className="text-pretty text-muted-foreground">{t('tools.spell.desc')}</p>
      </header>
      <Alert>
        <AlertDescription>{t('tools.spell.disclaimer')}</AlertDescription>
      </Alert>
      <div className="flex flex-col gap-2">
        <Label htmlFor="spell-input">{t('tools.spell.input')}</Label>
        <Textarea
          id="spell-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          spellCheck
          lang="ko"
        />
      </div>
      {text.trim() && issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('tools.spell.none')}</p>
      ) : (
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
          {issues.map((issue) => (
            <li key={issue.id}>{t(issue.messageKey)}</li>
          ))}
        </ul>
      )}
    </PublicPage>
  );
}
