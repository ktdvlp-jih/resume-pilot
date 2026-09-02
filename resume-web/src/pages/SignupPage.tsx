import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthLegalConsent, isLegalConsentComplete } from '@/components/auth/auth-legal-consent';
import { SocialLoginButtons } from '@/components/auth/social-login-buttons';
import { AuthFormCard, AuthSplitLayout } from '@/components/layout/auth-split-layout';
import { DocumentHead } from '@/components/seo/document-head';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, setTokens } from '@/lib/api';

export default function SignupPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [info, setInfo] = useState('');
  const [resending, setResending] = useState(false);

  const consentOk = isLegalConsentComplete(termsAccepted, privacyAccepted);

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
    if (!consentOk) {
      setError(t('auth.consentRequired'));
      return;
    }
    setLoading(true);
    try {
      const result = await api.signup(email, password, name, {
        termsAccepted,
        privacyAccepted,
      });
      if (result.requiresEmailVerification || !result.tokens) {
        setPendingEmail(result.email || email);
        setInfo(result.message || t('auth.checkEmailHint'));
        return;
      }
      setTokens(result.tokens.accessToken, result.tokens.refreshToken, result.tokens.userId);
      window.location.assign('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.signupFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail) return;
    setResending(true);
    setError('');
    try {
      await api.resendVerification(pendingEmail);
      setInfo(t('auth.resendSent'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.resendFailed'));
    } finally {
      setResending(false);
    }
  };

  if (pendingEmail) {
    return (
      <AuthSplitLayout title={t('auth.checkEmailTitle')} subtitle={t('app.tagline')}>
        <DocumentHead title={t('auth.checkEmailTitle')} description={t('landing.authPitch')} path="/signup" />
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
            <p className="text-sm text-muted-foreground">
              {t('auth.checkEmailDetail', { email: pendingEmail })}
            </p>
            <Button type="button" className="w-full rounded-full" onClick={handleResend} disabled={resending}>
              {resending ? t('common.loading') : t('auth.resendVerification')}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                {t('auth.login')}
              </Link>
            </p>
          </div>
        </AuthFormCard>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout title={t('auth.signupTitle')} subtitle={t('app.tagline')}>
      <DocumentHead title={t('auth.signup')} description={t('landing.authPitch')} path="/signup" />
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
            <div className="space-y-2">
              <Label htmlFor="name">{t('auth.name')}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>
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
              <Label htmlFor="password">{t('auth.passwordMin')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <AuthLegalConsent
              termsAccepted={termsAccepted}
              privacyAccepted={privacyAccepted}
              onTermsChange={setTermsAccepted}
              onPrivacyChange={setPrivacyAccepted}
            />
            <Button type="submit" className="w-full rounded-full" disabled={loading || !consentOk}>
              {loading ? t('common.loading') : t('auth.signupWithEmail')}
            </Button>
          </form>

          <SocialLoginButtons
            disabled={loading}
            consentOk={consentOk}
            onConsentRequired={() => setError(t('auth.consentRequired'))}
          />

          <p className="text-center text-sm text-muted-foreground">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              {t('auth.login')}
            </Link>
          </p>
        </div>
      </AuthFormCard>
    </AuthSplitLayout>
  );
}
