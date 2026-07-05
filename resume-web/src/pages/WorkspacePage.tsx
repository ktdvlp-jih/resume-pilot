import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api, type JobPostingResponse } from '../lib/api';
import { Button, Card, CardTitle } from '../components/ui/button';
import { HighlightedContent } from '../components/HighlightedContent';

const LEVEL_COLORS: Record<string, string> = {
  GREEN: 'bg-green-100 border-green-300 text-green-800 dark:bg-green-950 dark:text-green-200',
  YELLOW: 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
  RED: 'bg-red-100 border-red-300 text-red-800 dark:bg-red-950 dark:text-red-200',
};

export default function WorkspacePage() {
  const { t } = useTranslation();
  const [selectedPostingId, setSelectedPostingId] = useState('');
  const [jobText, setJobText] = useState('');
  const [rewriteLevel, setRewriteLevel] = useState(40);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [recommended, setRecommended] = useState<Array<{ id: string; title: string; score: number }>>([]);
  const [interview, setInterview] = useState<Array<{ category: string; question: string }>>([]);
  const [keywords, setKeywords] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: postings = [] } = useQuery({ queryKey: ['job-postings'], queryFn: api.listJobPostings });

  const getJobContext = async () => {
    let jobAnalysis: Record<string, unknown> = { raw_content: jobText };
    let kw: string[] = jobText.split(/\s+/).filter(Boolean).slice(0, 20);
    if (selectedPostingId) {
      const analysis = await api.getJobAnalysis(selectedPostingId);
      jobAnalysis = {
        company_name: analysis.companyName,
        position: analysis.position,
        required_skills: analysis.requiredSkills,
        tech_keywords: analysis.techKeywords,
        talent_profile: analysis.talentProfile,
      };
      kw = analysis.techKeywords.length ? analysis.techKeywords : kw;
    }
    return { jobAnalysis, keywords: kw, jobPostingId: selectedPostingId || undefined };
  };

  const handleRecommend = async () => {
    const { keywords: kw } = await getJobContext();
    const rec = await api.recommendExperiences(kw);
    setRecommended(rec.map(r => ({ id: r.id, title: r.title, score: r.score })));
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { jobAnalysis, keywords: kw, jobPostingId } = await getJobContext();
      const res = await api.generateAi({ keywords: kw, rewriteLevel, jobAnalysis, jobPostingId });
      setResult(res);
      if (res.content) {
        const iq = await api.interviewQuestions(String(res.content));
        setInterview((iq.questions as typeof interview) || []);
        const kc = await api.compareKeywords(kw, String(res.content));
        setKeywords(kc);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : t('workspace.generateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const detections = (result?.detections as Array<{ sentence: string; level: string; reason: string }>) || [];
  const reviews = (result?.reviews as Array<{ paragraph_index: number; strengths: string[]; weaknesses: string[]; improvement: string }>) || [];
  const scores = result?.quality_scores as Record<string, number> | undefined;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">{t('workspace.title')}</h2>

      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h3 className="font-semibold mb-3">{t('workspace.step1')}</h3>
        {postings.length > 0 && (
          <select value={selectedPostingId} onChange={e => setSelectedPostingId(e.target.value)}
            className="w-full mb-3 px-3 py-2 border rounded-lg dark:bg-gray-800">
            <option value="">{t('workspace.newOrManual')}</option>
            {postings.map((p: JobPostingResponse) => (
              <option key={p.id} value={p.id}>{p.title || p.companyName}</option>
            ))}
          </select>
        )}
        <textarea value={jobText} onChange={e => setJobText(e.target.value)}
          placeholder={t('workspace.jobPlaceholder')} className="w-full h-28 px-3 py-2 border rounded-lg dark:bg-gray-800" />
        <button onClick={handleRecommend} className="mt-2 mr-2 px-4 py-2 text-sm bg-gray-700 text-white rounded-lg">
          {t('workspace.recommend')}
        </button>
      </section>

      {recommended.length > 0 && (
        <section className="bg-white dark:bg-gray-900 border rounded-xl p-4">
          <h3 className="font-semibold mb-2">{t('workspace.recommended')}</h3>
          <div className="space-y-1">
            {recommended.map(r => (
              <div key={r.id} className="flex justify-between text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span>{r.title}</span>
                <span className="text-blue-600">{(r.score * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-white dark:bg-gray-900 border rounded-xl p-6">
        <h3 className="font-semibold mb-3">{t('workspace.step2', { level: rewriteLevel })}</h3>
        <input type="range" min={0} max={100} step={20} value={rewriteLevel}
          onChange={e => setRewriteLevel(Number(e.target.value))} className="w-full" />
      </section>

      <Button onClick={handleGenerate} disabled={loading || (!jobText && !selectedPostingId)}
        className="w-full py-3 rounded-xl">
        {loading ? t('common.generating') : t('workspace.generate')}
      </Button>

      {result && (
        <>
          {scores && (
            <section className="grid grid-cols-3 gap-3">
              {Object.entries(scores).map(([k, v]) => (
                <div key={k} className="bg-white dark:bg-gray-900 border rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">{k}</p>
                  <p className="text-xl font-bold">{v}</p>
                </div>
              ))}
            </section>
          )}
          <Card>
            <CardTitle>{t('workspace.result')}</CardTitle>
            <HighlightedContent content={String(result.content)} detections={detections} />
          </Card>
          {keywords && (
            <section className="bg-white dark:bg-gray-900 border rounded-xl p-6 text-sm">
              <h3 className="font-semibold mb-2">{t('workspace.keywordCompare')}</h3>
              <p><strong>{t('workspace.matched')}:</strong> {((keywords.matched as string[]) || []).join(', ') || t('common.none')}</p>
              <p className="text-red-600 mt-1"><strong>{t('workspace.missing')}:</strong> {((keywords.missing as string[]) || []).join(', ') || t('common.none')}</p>
            </section>
          )}
          {detections.length > 0 && (
            <section className="bg-white dark:bg-gray-900 border rounded-xl p-6">
              <h3 className="font-semibold mb-3">{t('workspace.aiDetection')}</h3>
              {detections.map((d, i) => (
                <div key={i} className={`p-3 mb-2 rounded-lg border ${LEVEL_COLORS[d.level] || ''}`}>
                  <p>{d.sentence}</p><p className="text-xs mt-1">{d.reason}</p>
                </div>
              ))}
            </section>
          )}
          {reviews.length > 0 && (
            <section className="bg-white dark:bg-gray-900 border rounded-xl p-6">
              <h3 className="font-semibold mb-3">{t('workspace.review')}</h3>
              {reviews.map(r => (
                <div key={r.paragraph_index} className="border rounded-lg p-4 mb-2">
                  <p className="text-sm"><strong>{t('workspace.strengths')}:</strong> {r.strengths.join(', ')}</p>
                  <p className="text-sm"><strong>{t('workspace.weaknesses')}:</strong> {r.weaknesses.join(', ')}</p>
                  <p className="text-sm text-blue-600">{r.improvement}</p>
                </div>
              ))}
            </section>
          )}
          {interview.length > 0 && (
            <section className="bg-white dark:bg-gray-900 border rounded-xl p-6">
              <h3 className="font-semibold mb-3">{t('workspace.interview')}</h3>
              {interview.map((q, i) => (
                <div key={i} className="p-3 mb-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <span className="text-xs text-blue-600">{q.category}</span>
                  <p className="text-sm">{q.question}</p>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
