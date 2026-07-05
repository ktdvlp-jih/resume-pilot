import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function WritingStylePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');

  const { data: style, isLoading } = useQuery({
    queryKey: ['writing-style'],
    queryFn: api.getWritingStyle,
  });

  const { data: resumes = [] } = useQuery({
    queryKey: ['resumes'],
    queryFn: api.listResumes,
  });

  const analyzeMutation = useMutation({
    mutationFn: (text: string) => api.analyzeWritingStyle(text),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['writingStyle'] }),
  });

  useEffect(() => {
    if (style && !content) return;
  }, [style, content]);

  const loadFromResume = (resumeContent: string) => {
    setContent(resumeContent);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">{t('writingStyle.title')}</h2>
      <p className="text-gray-500 text-sm">{t('writingStyle.description')}</p>

      {resumes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {resumes.filter((r) => r.latestContent).map((r) => (
            <button
              key={r.id}
              onClick={() => loadFromResume(r.latestContent!)}
              className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {r.title} {t('writingStyle.loadFrom')}
            </button>
          ))}
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t('writingStyle.placeholder')}
        className="w-full h-48 px-3 py-2 border rounded-xl dark:bg-gray-900"
      />

      <button
        onClick={() => analyzeMutation.mutate(content)}
        disabled={!content || analyzeMutation.isPending}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
      >
        {analyzeMutation.isPending ? t('common.analyzing') : t('writingStyle.analyze')}
      </button>

      {isLoading ? <p>{t('common.loading')}</p> : style && (
        <div className="bg-white dark:bg-gray-900 border rounded-xl p-6 space-y-4">
          <h3 className="font-semibold">{t('writingStyle.result')}</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Info label={t('writingStyle.sentenceStyle')} value={style.sentenceStyle} />
            <Info label={t('writingStyle.tone')} value={style.tone} />
            <Info label={t('writingStyle.formalSpeech')} value={style.usesFormalSpeech ? t('writingStyle.formalYes') : t('writingStyle.formalMixed')} />
            <Info label={t('writingStyle.avgSentenceLength')} value={style.avgSentenceLength ? `${style.avgSentenceLength}${t('writingStyle.chars')}` : '-'} />
          </div>
          {style.expressionStyle && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{style.expressionStyle}</p>
          )}
          {style.frequentWords.length > 0 && (
            <div>
              <p className="text-gray-500 text-sm mb-1">{t('writingStyle.frequentWords')}</p>
              <div className="flex flex-wrap gap-1">
                {style.frequentWords.map((w) => (
                  <span key={w} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">{w}</span>
                ))}
              </div>
            </div>
          )}
          {style.connectors.length > 0 && (
            <div>
              <p className="text-gray-500 text-sm mb-1">{t('writingStyle.connectors')}</p>
              <div className="flex flex-wrap gap-1">
                {style.connectors.map((c) => (
                  <span key={c} className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded text-xs">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-gray-500">{label}</p>
      <p className="font-medium">{value || '-'}</p>
    </div>
  );
}
