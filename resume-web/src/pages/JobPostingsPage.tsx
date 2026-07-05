import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type JobAnalysisResponse, type JobPostingResponse } from '../lib/api';

type SourceType = 'TEXT' | 'URL';

export default function JobPostingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [sourceType, setSourceType] = useState<SourceType>('TEXT');
  const [content, setContent] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [title, setTitle] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<JobAnalysisResponse | null>(null);

  const { data: postings = [], isLoading } = useQuery({
    queryKey: ['job-postings'],
    queryFn: api.listJobPostings,
  });

  const uploadMutation = useMutation({
    mutationFn: api.uploadJobPosting,
    onSuccess: async (posting) => {
      queryClient.invalidateQueries({ queryKey: ['job-postings'] });
      setSelectedId(posting.id);
      const result = await api.getJobAnalysis(posting.id);
      setAnalysis(result);
      setContent('');
      setSourceUrl('');
      setTitle('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteJobPosting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-postings'] });
      if (selectedId) { setSelectedId(null); setAnalysis(null); }
    },
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    uploadMutation.mutate({
      sourceType,
      content: sourceType === 'TEXT' ? content : undefined,
      sourceUrl: sourceType === 'URL' ? sourceUrl : undefined,
      title: title || undefined,
    });
  };

  const handleSelect = async (posting: JobPostingResponse) => {
    setSelectedId(posting.id);
    try {
      const result = await api.getJobAnalysis(posting.id);
      setAnalysis(result);
    } catch {
      setAnalysis(null);
    }
  };

  const fileUploadMutation = useMutation({
    mutationFn: ({ file, title: fileTitle }: { file: File; title?: string }) => api.uploadJobPostingFile(file, fileTitle),
    onSuccess: async (posting) => {
      queryClient.invalidateQueries({ queryKey: ['job-postings'] });
      setSelectedId(posting.id);
      const result = await api.getJobAnalysis(posting.id);
      setAnalysis(result);
    },
  });

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const isPdfOrImage = file.type.includes('pdf') || file.type.startsWith('image/');
    if (isPdfOrImage) {
      fileUploadMutation.mutate({ file, title: file.name });
    } else {
      file.text().then((text) => {
        setSourceType('TEXT');
        setContent(text);
        setTitle(file.name);
      });
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) fileUploadMutation.mutate({ file, title: file.name });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">{t('jobPostings.title')}</h2>

      <form onSubmit={handleUpload} className="bg-white dark:bg-gray-900 border rounded-xl p-6 space-y-4">
        <div className="flex gap-2">
          {(['TEXT', 'URL'] as SourceType[]).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSourceType(st)}
              className={`px-4 py-2 rounded-lg text-sm ${sourceType === st ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
            >
              {st === 'TEXT' ? t('jobPostings.textOrFile') : t('jobPostings.url')}
            </button>
          ))}
        </div>

        <input
          placeholder={t('jobPostings.titleOptional')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800"
        />

        {sourceType === 'TEXT' ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4"
          >
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('jobPostings.contentPlaceholder')}
              className="w-full h-40 px-3 py-2 border rounded-lg dark:bg-gray-800"
              required
            />
            <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt" onChange={handleFileInput}
              className="mt-2 text-sm text-gray-500" />
            {fileUploadMutation.isPending && <p className="text-sm text-blue-600 mt-2">{t('jobPostings.fileAnalyzing')}</p>}
          </div>
        ) : (
          <input
            type="url"
            placeholder="https://..."
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800"
            required
          />
        )}

        <button
          type="submit"
          disabled={uploadMutation.isPending}
          className="ui-btn-primary px-6"
        >
          {uploadMutation.isPending ? t('common.analyzing') : t('jobPostings.uploadAnalyze')}
        </button>
      </form>

      <div className="grid md:grid-cols-2 gap-6">
        <section>
          <h3 className="font-semibold mb-3">{t('jobPostings.saved')}</h3>
          {isLoading ? <p className="text-gray-500">{t('common.loading')}</p> : postings.length === 0 ? (
            <p className="text-gray-500 text-sm">{t('jobPostings.empty')}</p>
          ) : (
            <div className="space-y-2">
              {postings.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  className={`ui-card-clickable ${selectedId === p.id ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40' : ''}`}
                >
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">{p.title || p.companyName || t('jobPostings.noTitle')}</p>
                      <p className="text-sm text-blue-600">{p.companyName}</p>
                      <p className="text-xs text-gray-500 mt-1">{p.sourceType} · {new Date(p.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(p.id); }}
                      className="ui-link-danger text-sm"
                    >{t('common.delete')}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="font-semibold mb-3">{t('jobPostings.analysis')}</h3>
          {!analysis ? (
            <p className="text-gray-500 text-sm">{t('jobPostings.selectOrUpload')}</p>
          ) : (
            <div className="bg-white dark:bg-gray-900 border rounded-xl p-5 space-y-4 text-sm">
              <div>
                <p className="text-gray-500">{t('jobPostings.company')}</p>
                <p className="font-semibold text-lg">{analysis.companyName || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">{t('jobPostings.position')}</p>
                <p>{analysis.position || '-'}</p>
              </div>
              <TagSection title={t('jobPostings.requiredSkills')} tags={analysis.requiredSkills} color="blue" />
              <TagSection title={t('jobPostings.preferredSkills')} tags={analysis.preferredSkills} color="green" />
              <TagSection title={t('jobPostings.techKeywords')} tags={analysis.techKeywords} color="purple" />
              <TagSection title={t('jobPostings.talentProfile')} tags={analysis.talentProfile} color="orange" />
              <TagSection title={t('jobPostings.coreCompetencies')} tags={analysis.coreCompetencies} color="gray" />
              {analysis.orgCulture && (
                <div>
                  <p className="text-gray-500">{t('jobPostings.orgCulture')}</p>
                  <p>{analysis.orgCulture}</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function TagSection({ title, tags, color }: { title: string; tags: string[]; color: string }) {
  if (!tags.length) return null;
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    purple: 'bg-purple-100 text-purple-800',
    orange: 'bg-orange-100 text-orange-800',
    gray: 'bg-gray-100 text-gray-800',
  };
  return (
    <div>
      <p className="text-gray-500 mb-1">{title}</p>
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <span key={tag} className={`px-2 py-0.5 rounded text-xs ${colors[color]}`}>{tag}</span>
        ))}
      </div>
    </div>
  );
}
