import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, setTokens } from '../lib/api';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const tokens = await api.login(email, password);
      setTokens(tokens.accessToken, tokens.refreshToken);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.loginFailed'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <form onSubmit={handleSubmit} className="ui-card w-full max-w-md shadow-lg space-y-4">
        <div className="flex justify-end"><LanguageSwitcher /></div>
        <h1 className="text-2xl font-bold text-center">{t('app.name')}</h1>
        <p className="text-center text-zinc-500 text-sm">{t('app.tagline')}</p>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input
          type="email"
          placeholder={t('auth.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="ui-input"
          required
        />
        <input
          type="password"
          placeholder={t('auth.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="ui-input"
          required
        />
        <button type="submit" className="ui-btn-primary w-full py-2.5">
          {t('auth.login')}
        </button>
        <p className="text-center text-sm">
          {t('auth.noAccount')} <Link to="/signup" className="ui-link">{t('auth.signup')}</Link>
        </p>
      </form>
    </div>
  );
}
