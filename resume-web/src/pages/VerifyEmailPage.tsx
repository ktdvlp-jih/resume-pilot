import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, setTokens } from '@/lib/api';
import { AuthFormCard, AuthSplitLayout } from '@/components/layout/auth-split-layout';
import { DocumentHead } from '@/components/seo/document-head';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/loading-state';

type VerifyState = 'loading' | 'success' | 'already' | 'error';

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<VerifyState>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setState('error');
      setMessage(t('auth.verifyMissingToken'));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const tokens = await api.verifyEmail(token);
        if (cancelled) return;
        setTokens(tokens.accessToken, tokens.refreshToken, tokens.userId);
        setState('success');
        window.location.assign('/onboarding');
      } catch (err) {
        if (cancelled) return;
        const code = err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : '';
        if (code === 'EMAIL_ALREADY_VERIFIED') {
          setState('already');
          setMessage(t('auth.verifyAlreadyDone'));
          return;
        }
        setState('error');
        const raw = err instanceof Error ? err.message : '';
        // 영문/개발자용 문구는 사용자에게 그대로 노출하지 않음
        if (!raw || /authentication required|access denied|request failed/i.test(raw)) {
          setMessage(t('auth.verifyFailed'));
        } else {
          setMessage(raw);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, t]);

  return (
    <AuthSplitLayout title={t('auth.verifyTitle')} subtitle={t('app.tagline')}>
      <DocumentHead title={t('auth.verifyTitle')} description={t('landing.authPitch')} path="/verify-email" />
      <AuthFormCard>
        <div className="space-y-4">
          {state === 'loading' && <LoadingSpinner className="min-h-[120px]" label={t('auth.verifying')} />}

          {state === 'success' && (
            <p className="text-center text-sm text-muted-foreground">{t('auth.verifySuccess')}</p>
          )}

          {state === 'already' && (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {state === 'error' && (
            <Alert variant="destructive">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {state !== 'loading' && (
            <div className="flex justify-center">
              <Button asChild className="rounded-full">
                <Link to="/login">{t('auth.login')}</Link>
              </Button>
            </div>
          )}
        </div>
      </AuthFormCard>
    </AuthSplitLayout>
  );
}
