import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

type Props = {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  onTermsChange: (value: boolean) => void;
  onPrivacyChange: (value: boolean) => void;
  className?: string;
};

export function AuthLegalConsent({
  termsAccepted,
  privacyAccepted,
  onTermsChange,
  onPrivacyChange,
  className,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className={cn('space-y-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-3', className)}>
      <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-snug text-foreground">
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
          checked={termsAccepted}
          onChange={(e) => onTermsChange(e.target.checked)}
          aria-required
        />
        <span>
          {t('auth.agreeTermsPrefix')}{' '}
          <Link
            to="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-4 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {t('auth.termsLink')}
          </Link>
          {t('auth.agreeRequiredSuffix')}
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-snug text-foreground">
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
          checked={privacyAccepted}
          onChange={(e) => onPrivacyChange(e.target.checked)}
          aria-required
        />
        <span>
          {t('auth.agreePrivacyPrefix')}{' '}
          <Link
            to="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-4 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {t('auth.privacyLink')}
          </Link>
          {t('auth.agreeRequiredSuffix')}
        </span>
      </label>
    </div>
  );
}

export function isLegalConsentComplete(termsAccepted: boolean, privacyAccepted: boolean): boolean {
  return termsAccepted && privacyAccepted;
}
