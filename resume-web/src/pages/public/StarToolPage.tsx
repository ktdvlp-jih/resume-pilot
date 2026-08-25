import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PublicPage } from '@/components/layout/public-page';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getAccessToken } from '@/lib/api';

function composeStar(s: string, tsk: string, a: string, r: string) {
  return [`상황: ${s}`, `과제: ${tsk}`, `행동: ${a}`, `결과: ${r}`].join('\n\n');
}

export default function StarToolPage() {
  const { t } = useTranslation();
  const [situation, setSituation] = useState('');
  const [task, setTask] = useState('');
  const [action, setAction] = useState('');
  const [result, setResult] = useState('');
  const loggedIn = !!getAccessToken();

  const copy = async () => {
    const text = composeStar(situation, task, action, result);
    await navigator.clipboard.writeText(text);
    toast.success(t('common.copied'));
  };

  const fields = [
    { id: 'star-s', label: t('experiences.starSituation'), value: situation, set: setSituation },
    { id: 'star-t', label: t('experiences.starTask'), value: task, set: setTask },
    { id: 'star-a', label: t('experiences.starAction'), value: action, set: setAction },
    { id: 'star-r', label: t('experiences.starResult'), value: result, set: setResult },
  ] as const;

  return (
    <PublicPage title={t('tools.star.title')} description={t('tools.star.desc')} path="/tools/star">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('tools.star.title')}</h1>
        <p className="text-pretty text-muted-foreground">{t('tools.star.desc')}</p>
      </header>
      <div className="flex flex-col gap-4">
        {fields.map((field) => (
          <div key={field.id} className="flex flex-col gap-2">
            <Label htmlFor={field.id}>{field.label}</Label>
            <Textarea
              id={field.id}
              value={field.value}
              onChange={(e) => field.set(e.target.value)}
              rows={4}
              spellCheck
            />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void copy()}>
          {t('common.copy')}
        </Button>
        {loggedIn ? (
          <Button variant="outline" asChild>
            <Link to="/experiences">{t('tools.saveInApp')}</Link>
          </Button>
        ) : (
          <Button variant="outline" asChild>
            <Link to="/signup">{t('tools.signupToSave')}</Link>
          </Button>
        )}
      </div>
    </PublicPage>
  );
}
