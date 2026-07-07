import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, setTokens } from '@/lib/api';
import { AuthFormCard, AuthSplitLayout } from '@/components/layout/auth-split-layout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const tokens = await api.signup(email, password, name);
      setTokens(tokens.accessToken, tokens.refreshToken);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.signupFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout title={t('auth.signupTitle')} subtitle={t('app.tagline')}>
      <AuthFormCard>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">{t('auth.name')}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.passwordMin')}</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('common.loading') : t('auth.signupAction')}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              {t('auth.login')}
            </Link>
          </p>
        </form>
      </AuthFormCard>
    </AuthSplitLayout>
  );
}
