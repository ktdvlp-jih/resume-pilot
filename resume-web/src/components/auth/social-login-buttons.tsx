import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, type OAuthProvidersResponse } from '@/lib/api';
import { cn } from '@/lib/utils';

type Props = {
  disabled?: boolean;
  /** false면 소셜 버튼 클릭 시 약관 동의 유도 */
  consentOk?: boolean;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
  onConsentRequired?: () => void;
};

function KakaoGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M12 4C7.03 4 3 7.13 3 10.98c0 2.47 1.64 4.64 4.11 5.87l-.78 2.9c-.1.36.3.66.62.47l3.5-2.18c.5.06 1.02.1 1.55.1 4.97 0 9-3.13 9-6.98S16.97 4 12 4z"
      />
    </svg>
  );
}

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function toUserOauthError(raw: string, fallback: string): string {
  if (!raw || /internal server error|request failed|access denied/i.test(raw)) {
    return fallback;
  }
  return raw;
}

export function SocialLoginButtons({
  disabled,
  consentOk = true,
  termsAccepted = false,
  privacyAccepted = false,
  onConsentRequired,
}: Props) {
  const { t } = useTranslation();
  const [providers, setProviders] = useState<OAuthProvidersResponse>({ google: false, kakao: false });
  const [loading, setLoading] = useState<'google' | 'kakao' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .getOAuthProviders()
      .then((data) => {
        if (!cancelled) setProviders(data);
      })
      .catch(() => {
        if (!cancelled) setProviders({ google: false, kakao: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 카카오/구글에서 뒤로가기(bfcache)로 돌아오면 loading이 남아 버튼이 잠기던 문제 해제
  useEffect(() => {
    const reset = () => setLoading(null);
    reset();
    window.addEventListener('pageshow', reset);
    window.addEventListener('focus', reset);
    document.addEventListener('visibilitychange', reset);
    return () => {
      window.removeEventListener('pageshow', reset);
      window.removeEventListener('focus', reset);
      document.removeEventListener('visibilitychange', reset);
    };
  }, []);

  const startOAuth = async (provider: 'google' | 'kakao') => {
    if (!consentOk) {
      setError(t('auth.consentRequired'));
      onConsentRequired?.();
      return;
    }
    setError('');
    setLoading(provider);
    try {
      const { authorizeUrl } = await api.getOAuthAuthorizeUrl(
        provider,
        window.location.origin,
        window.location.pathname || '/login',
        { termsAccepted, privacyAccepted },
      );
      window.location.assign(authorizeUrl);
      // 이동이 안 되거나 뒤로가기로 복귀할 수 있으므로 잠시 후 잠금 해제
      window.setTimeout(() => setLoading(null), 1500);
    } catch (err) {
      setError(toUserOauthError(err instanceof Error ? err.message : '', t('auth.oauthFailed')));
      setLoading(null);
    }
  };

  if (!providers.google && !providers.kakao) {
    return null;
  }

  const busy = disabled || loading !== null;

  return (
    <div className="space-y-4 pt-1">
      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-3 text-muted-foreground">{t('auth.orContinueWith')}</span>
        </div>
      </div>
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
      <div className="flex items-center justify-center gap-5">
        {providers.kakao && (
          <button
            type="button"
            disabled={busy}
            onClick={() => startOAuth('kakao')}
            aria-label={t('auth.continueWithKakao')}
            title={t('auth.continueWithKakao')}
            className={cn(
              'flex size-12 items-center justify-center rounded-full bg-[#FEE500] text-[#191919] shadow-sm transition',
              'hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:pointer-events-none disabled:opacity-50',
              loading === 'kakao' && 'ring-2 ring-primary/40',
            )}
          >
            <KakaoGlyph className="size-6" />
          </button>
        )}
        {providers.google && (
          <button
            type="button"
            disabled={busy}
            onClick={() => startOAuth('google')}
            aria-label={t('auth.continueWithGoogle')}
            title={t('auth.continueWithGoogle')}
            className={cn(
              'flex size-12 items-center justify-center rounded-full border border-border bg-white shadow-sm transition',
              'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:pointer-events-none disabled:opacity-50',
              loading === 'google' && 'ring-2 ring-primary/40',
            )}
          >
            <GoogleGlyph className="size-6" />
          </button>
        )}
      </div>
    </div>
  );
}
