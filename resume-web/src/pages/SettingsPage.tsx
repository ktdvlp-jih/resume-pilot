import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function SettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: api.getMe });
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setBio(user.bio || '');
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: () => api.updateMe({ name, phone, bio }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['me'] }); setMsg(t('settings.profileSaved')); },
  });

  const passwordMutation = useMutation({
    mutationFn: () => api.changePassword(currentPassword, newPassword),
    onSuccess: () => { setMsg(t('settings.passwordChanged')); setCurrentPassword(''); setNewPassword(''); },
    onError: (err) => setMsg(err instanceof Error ? err.message : t('settings.passwordChangeFailed')),
  });

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-2xl font-bold">{t('settings.title')}</h2>
      {msg && <p className="text-green-600 text-sm">{msg}</p>}

      <section className="bg-white dark:bg-gray-900 border rounded-xl p-6 space-y-3">
        <h3 className="font-semibold">{t('settings.profile')}</h3>
        <p className="text-sm text-gray-500">{user?.email}</p>
        <input placeholder={t('auth.name')} value={name} onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800" />
        <input placeholder={t('settings.phone')} value={phone} onChange={(e) => setPhone(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800" />
        <textarea placeholder={t('settings.bio')} value={bio} onChange={(e) => setBio(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800" rows={3} />
        <button onClick={() => updateMutation.mutate()} className="px-4 py-2 bg-blue-600 text-white rounded-lg">{t('common.save')}</button>
      </section>

      <section className="bg-white dark:bg-gray-900 border rounded-xl p-6 space-y-3">
        <h3 className="font-semibold">{t('settings.changePassword')}</h3>
        <input type="password" placeholder={t('settings.currentPassword')} value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800" />
        <input type="password" placeholder={t('settings.newPassword')} value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800" />
        <button onClick={() => passwordMutation.mutate()} className="px-4 py-2 bg-gray-700 text-white rounded-lg">{t('settings.change')}</button>
      </section>
    </div>
  );
}
