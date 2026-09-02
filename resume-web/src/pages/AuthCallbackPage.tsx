import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, setTokens } from '@/lib/api';
import { AuthFormCard, AuthSplitLayout } from '@/components/layout/auth-split-layout';
import { DocumentHead } from '@/components/seo/document-head';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/common/loading-state';
import { cn } from '@/lib/utils';

function providerLabel(provider: string, t: (key: string) => string): string {
  if (provider === 'google') return t('auth.providerGoogle');
  if (provider === 'kakao') return t('auth.providerKakao');
  return provider;
}

type LinkMethod = 'password' | 'email';

export default function AuthCallbackPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [password, setPassword] = useState('');
  const [linking, setLinking] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const linkRequired = searchParams.get('linkRequired') === '1';
  const linkToken = searchParams.get('linkToken') ?? '';
  const emailMasked = searchParams.get('email') ?? '';
  const provider = searchParams.get('provider') ?? '';
  const passwordRequired = searchParams.get('passwordRequired') === '1';
  const emailConfirm = searchParams.get('emailConfirm') === '1';
  const emailToken = searchParams.get('emailToken') ?? '';

  const [method, setMethod] = useState<LinkMethod>(passwordRequired ? 'password' : 'email');

  useEffect(() => {
    if (linkRequired && emailConfirm && emailToken && linkToken) {
      let cancelled = false;
      (async () => {
        setLinking(true);
        setError('');
        try {
          const tokens = await api.linkOAuthAccount(linkToken, { emailToken });
          if (cancelled) return;
          setTokens(tokens.accessToken, tokens.refreshToken, tokens.userId);
          window.location.assign('/dashboard');
        } catch (err) {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : t('auth.linkFailed'));
          setLinking(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    if (linkRequired) {
      return;
    }
    const oauthError = searchParams.get('error');
    if (oauthError) {
      setError(oauthError);
      return;
    }
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const userId = searchParams.get('userId') ?? undefined;
    if (!accessToken || !refreshToken) {
      setError(t('auth.oauthFailed'));
      return;
    }
    setTokens(accessToken, refreshToken, userId);
    window.location.assign('/dashboard');
  }, [searchParams, t, linkRequired, emailConfirm, emailToken, linkToken]);

  const handlePasswordLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkToken) {
      setError(t('auth.oauthFailed'));
      return;
    }
    if (!password.trim()) {
      setError(t('auth.linkPasswordRequired'));
      return;
    }
    setError('');
    setInfo('');
    setLinking(true);
    try {
      const tokens = await api.linkOAuthAccount(linkToken, { password });
      setTokens(tokens.accessToken, tokens.refreshToken, tokens.userId);
      window.location.assign('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.linkFailed'));
      setLinking(false);
    }
  };

  const handleSendLinkEmail = async () => {
    if (!linkToken) {
      setError(t('auth.oauthFailed'));
      return;
    }
    setError('');
    setInfo('');
    setSendingEmail(true);
    try {
      await api.sendOAuthLinkEmail(linkToken);
      setEmailSent(true);
      setInfo(t('auth.linkEmailSent'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.linkEmailSendFailed'));
    } finally {
      setSendingEmail(false);
    }
  };

  if (linkRequired && emailConfirm && !error) {
    return (
      <AuthSplitLayout title={t('auth.linkTitle')} subtitle={t('app.tagline')}>
        <DocumentHead title={t('auth.linkTitle')} description={t('landing.authPitch')} path="/auth/callback" />
        <AuthFormCard>
          <LoadingSpinner className="min-h-[120px]" label={t('auth.linkEmailConfirming')} />
        </AuthFormCard>
      </AuthSplitLayout>
    );
  }

  if (linkRequired) {
    return (
      <AuthSplitLayout title={t('auth.linkTitle')} subtitle={t('app.tagline')}>
        <DocumentHead title={t('auth.linkTitle')} description={t('landing.authPitch')} path="/auth/callback" />
        <AuthFormCard>
          <div className="space-y-4">
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
            <Alert>
              <AlertDescription>
                {t('auth.linkHint', {
                  email: emailMasked || t('auth.email'),
                  provider: providerLabel(provider, t),
                })}
              </AlertDescription>
            </Alert>

            {passwordRequired && (
              <div className="grid grid-cols-2 gap-2 rounded-full bg-muted/50 p-1">
                <button
                  type="button"
                  className={cn(
                    'rounded-full px-3 py-2 text-sm font-medium transition',
                    method === 'password' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
                  )}
                  onClick={() => setMethod('password')}
                >
                  {t('auth.linkMethodPassword')}
                </button>
                <button
                  type="button"
                  className={cn(
                    'rounded-full px-3 py-2 text-sm font-medium transition',
                    method === 'email' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
                  )}
                  onClick={() => setMethod('email')}
                >
                  {t('auth.linkMethodEmail')}
                </button>
              </div>
            )}

            {method === 'password' && passwordRequired ? (
              <form onSubmit={handlePasswordLink} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="link-password">{t('auth.password')}</Label>
                  <Input
                    id="link-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <p className="text-xs text-muted-foreground">{t('auth.linkPasswordHint')}</p>
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={linking}>
                  {linking ? t('common.loading') : t('auth.linkConfirm')}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{t('auth.linkEmailHint')}</p>
                <Button
                  type="button"
                  className="w-full rounded-full"
                  disabled={sendingEmail || linking}
                  onClick={handleSendLinkEmail}
                >
                  {sendingEmail
                    ? t('common.loading')
                    : emailSent
                      ? t('auth.linkEmailResend')
                      : t('auth.linkEmailSend')}
                </Button>
              </div>
            )}

            <p className="text-center text-sm text-muted-foreground">
              <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                {t('auth.linkCancel')}
              </Link>
            </p>
          </div>
        </AuthFormCard>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout title={t('auth.oauthTitle')} subtitle={t('app.tagline')}>
      <DocumentHead title={t('auth.oauthTitle')} description={t('landing.authPitch')} path="/auth/callback" />
      <AuthFormCard>
        <div className="space-y-4">
          {error ? (
            <>
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <p className="text-center text-sm">
                <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                  {t('auth.login')}
                </Link>
              </p>
            </>
          ) : (
            <LoadingSpinner className="min-h-[120px]" label={t('auth.oauthProcessing')} />
          )}
          {error && (
            <div className="flex justify-center">
              <Button asChild variant="outline">
                <Link to="/signup">{t('auth.signup')}</Link>
              </Button>
            </div>
          )}
        </div>
      </AuthFormCard>
    </AuthSplitLayout>
  );
}
