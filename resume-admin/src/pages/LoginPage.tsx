import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { api, setTokens } from '../lib/api';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tokens = await api.login(email, password);
      setTokens(tokens.accessToken, tokens.refreshToken);
      navigate('/prompts');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.loginFailed'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-gray-800 p-8 rounded-xl space-y-4">
        <div className="flex justify-end"><LanguageSwitcher /></div>
        <h1 className="text-2xl font-bold text-white text-center">{t('auth.loginTitle')}</h1>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <input type="email" placeholder={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg" required />
        <input type="password" placeholder={t('auth.password')} value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg" required />
        <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg">{t('auth.login')}</button>
      </form>
    </div>
  );
}
