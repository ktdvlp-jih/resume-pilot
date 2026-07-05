import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

function diffLines(a: string, b: string) {
  const la = a.split('\n');
  const lb = b.split('\n');
  const max = Math.max(la.length, lb.length);
  const rows: { a: string; b: string; changed: boolean }[] = [];
  for (let i = 0; i < max; i++) {
    const lineA = la[i] ?? '';
    const lineB = lb[i] ?? '';
    rows.push({ a: lineA, b: lineB, changed: lineA !== lineB });
  }
  return rows;
}

export default function VersionComparePage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const versionA = Number(params.get('a') || 1);
  const versionB = Number(params.get('b') || 2);

  const { data: versions = [] } = useQuery({
    queryKey: ['resume-versions', id],
    queryFn: () => api.listResumeVersions(id!),
    enabled: !!id,
  });

  const va = versions.find(v => v.versionNumber === versionA);
  const vb = versions.find(v => v.versionNumber === versionB);
  const rows = va && vb ? diffLines(va.content, vb.content) : [];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">{t('versionCompare.title')}</h2>
      <div className="flex gap-4 mb-4">
        <select value={versionA} onChange={e => setParams({ a: e.target.value, b: String(versionB) })}
          className="px-3 py-2 border rounded-lg dark:bg-gray-900">
          {versions.map(v => <option key={v.id} value={v.versionNumber}>v{v.versionNumber}</option>)}
        </select>
        <span className="self-center">{t('common.vs')}</span>
        <select value={versionB} onChange={e => setParams({ a: String(versionA), b: e.target.value })}
          className="px-3 py-2 border rounded-lg dark:bg-gray-900">
          {versions.map(v => <option key={v.id} value={v.versionNumber}>v{v.versionNumber}</option>)}
        </select>
      </div>
      {rows.length === 0 ? (
        <p className="text-gray-500">{t('versionCompare.needTwo')}</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border rounded-xl p-4 bg-white dark:bg-gray-900">
            <h3 className="font-semibold mb-2">v{versionA}</h3>
            {rows.map((r, i) => (
              <p key={i} className={`text-sm py-0.5 ${r.changed ? 'bg-red-100 dark:bg-red-950' : ''}`}>{r.a || ' '}</p>
            ))}
          </div>
          <div className="border rounded-xl p-4 bg-white dark:bg-gray-900">
            <h3 className="font-semibold mb-2">v{versionB}</h3>
            {rows.map((r, i) => (
              <p key={i} className={`text-sm py-0.5 ${r.changed ? 'bg-green-100 dark:bg-green-950' : ''}`}>{r.b || ' '}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
