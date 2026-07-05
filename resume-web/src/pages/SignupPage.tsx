import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, setTokens } from '../lib/api';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export default function SignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const tokens = await api.signup(email, password, name);
      setTokens(tokens.accessToken, tokens.refreshToken);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.signupFailed'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white dark:bg-gray-900 p-8 rounded-xl shadow-lg space-y-4">
        <div className="flex justify-end"><LanguageSwitcher /></div>
        <h1 className="text-2xl font-bold text-center">{t('auth.signupTitle')}</h1>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input type="text" placeholder={t('auth.name')} value={name} onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
        <input type="email" placeholder={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" required />
        <input type="password" placeholder={t('auth.passwordMin')} value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" required minLength={8} />
        <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t('auth.signupAction')}</button>
        <p className="text-center text-sm">
          {t('auth.hasAccount')} <Link to="/login" className="text-blue-600">{t('auth.login')}</Link>
        </p>
      </form>
    </div>
  );
}
