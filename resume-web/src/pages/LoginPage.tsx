import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SocialLoginButtons } from '@/components/auth/social-login-buttons';
import { AuthFormCard, AuthSplitLayout } from '@/components/layout/auth-split-layout';
import { DocumentHead } from '@/components/seo/document-head';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, setTokens } from '@/lib/api';

export default function LoginPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const oauth = searchParams.get('oauth');
    if (!oauth) return;
    if (oauth === 'cancelled') {
      setInfo(t('auth.oauthCancelled'));
      setError('');
    } else {
      const msg = searchParams.get('oauthMessage');
      setError(msg && msg.trim() ? msg : t('auth.oauthFailed'));
      setInfo('');
    }
    const next = new URLSearchParams(searchParams);
    next.delete('oauth');
    next.delete('oauthMessage');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setNeedsVerification(false);
    setLoading(true);
    try {
      const tokens = await api.login(email, password);
      setTokens(tokens.accessToken, tokens.refreshToken, tokens.userId);
      window.location.assign('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.loginFailed');
      setError(message);
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : '';
      if (code === 'EMAIL_NOT_VERIFIED' || message.includes('이메일 인증')) {
        setNeedsVerification(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError(t('auth.emailRequiredForResend'));
      return;
    }
    setResending(true);
    setError('');
    try {
      await api.resendVerification(email.trim());
      setInfo(t('auth.resendSent'));
      setNeedsVerification(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.resendFailed'));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthSplitLayout title={t('auth.login')} subtitle={t('app.tagline')}>
      <DocumentHead title={t('auth.login')} description={t('landing.authPitch')} path="/login" />
      <AuthFormCard>
        <div className="space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {info && (
              <Alert>
                <AlertDescription>{info}</AlertDescription>
              </Alert>
            )}
            {!error && !info && searchParams.get('expired') === '1' && (
              <Alert>
                <AlertDescription>{t('auth.sessionExpired')}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full rounded-full" disabled={loading}>
              {loading ? t('common.loading') : t('auth.loginWithEmail')}
            </Button>
            {(needsVerification || error.includes('이메일 인증')) && (
              <Button type="button" variant="outline" className="w-full rounded-full" onClick={handleResend} disabled={resending}>
                {resending ? t('common.loading') : t('auth.resendVerification')}
              </Button>
            )}
          </form>

          <SocialLoginButtons disabled={loading} />

          <p className="text-center text-sm text-muted-foreground">
            {t('auth.noAccount')}{' '}
            <Link to="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
              {t('auth.signup')}
            </Link>
          </p>
        </div>
      </AuthFormCard>
    </AuthSplitLayout>
  );
}
