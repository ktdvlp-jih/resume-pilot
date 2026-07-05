import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { CareerPortfolioEditor } from '../components/career/CareerPortfolioEditor';
import { normalizeCareerPortfolio, portfolioCompletion, type CareerPortfolio } from '../lib/career-portfolio';

type Tab = 'portfolio' | 'account';

export default function SettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('portfolio');
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: api.getMe });
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [portfolio, setPortfolio] = useState<CareerPortfolio>(normalizeCareerPortfolio());
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setBio(user.bio || '');
      setPortfolio(normalizeCareerPortfolio(user.careerPortfolio));
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: () => api.updateMe({ name, phone, bio, careerPortfolio: portfolio }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setMsg(t('settings.profileSaved'));
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () => api.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setMsg(t('settings.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
    },
    onError: (err) => setMsg(err instanceof Error ? err.message : t('settings.passwordChangeFailed')),
  });

  const pct = portfolioCompletion(portfolio);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">{t('settings.myPage')}</h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">{t('settings.myPageSubtitle')}</p>
      </div>

      {msg && (
        <p className="mb-4 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2">
          {msg}
        </p>
      )}

      <div className="flex gap-2 mb-6 p-1 rounded-2xl bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-zinc-800">
        <TabButton active={tab === 'portfolio'} onClick={() => setTab('portfolio')}>
          {t('portfolio.tab')} · {pct}%
        </TabButton>
        <TabButton active={tab === 'account'} onClick={() => setTab('account')}>
          {t('settings.accountTab')}
        </TabButton>
      </div>

      {tab === 'portfolio' ? (
        <div className="space-y-6">
          <CareerPortfolioEditor value={portfolio} onChange={setPortfolio} />
          <button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {updateMutation.isPending ? t('common.loading') : t('portfolio.saveAll')}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 p-6 space-y-3">
            <h3 className="font-semibold">{t('settings.profile')}</h3>
            <p className="text-sm text-zinc-500">{user?.email}</p>
            <input placeholder={t('auth.name')} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            <input placeholder={t('settings.phone')} value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
            <textarea placeholder={t('settings.bio')} value={bio} onChange={(e) => setBio(e.target.value)} className={inputCls} rows={2} />
            <button onClick={() => updateMutation.mutate()} className="px-4 py-2 bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 text-white rounded-xl text-sm">
              {t('common.save')}
            </button>
          </section>
          <section className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 p-6 space-y-3">
            <h3 className="font-semibold">{t('settings.changePassword')}</h3>
            <input type="password" placeholder={t('settings.currentPassword')} value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)} className={inputCls} />
            <input type="password" placeholder={t('settings.newPassword')} value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)} className={inputCls} />
            <button onClick={() => passwordMutation.mutate()} className="px-4 py-2 bg-zinc-700 text-white rounded-xl text-sm">
              {t('settings.change')}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white/80 dark:bg-zinc-900/80 text-sm';

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${
        active
          ? 'bg-white dark:bg-zinc-800 text-violet-600 dark:text-violet-300 shadow-sm'
          : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
      }`}
    >
      {children}
    </button>
  );
}
