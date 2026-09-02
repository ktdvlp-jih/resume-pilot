import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface LogoMarkProps {
  size?: number;
  className?: string;
}

/** 단일 소스: /logo-mark.png (favicon.svg·logo.svg도 동일 PNG) */
export function LogoMark({ size = 32, className = '' }: LogoMarkProps) {
  return (
    <img
      src="/logo-mark.png"
      width={size}
      height={size}
      alt=""
      aria-hidden
      className={cn('shrink-0 rounded-[22%]', className)}
      draggable={false}
    />
  );
}

type LogoVariant = 'public' | 'sidebar' | 'brand';

interface LogoProps {
  to?: string;
  showText?: boolean;
  className?: string;
  variant?: LogoVariant;
}

const variantClass: Record<LogoVariant, string> = {
  public: 'text-foreground hover:bg-accent hover:text-accent-foreground',
  sidebar: 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
  brand: 'text-white hover:bg-white/10',
};

export function Logo({ to = '/', showText = true, className, variant = 'public' }: LogoProps) {
  const content = (
    <>
      <LogoMark size={32} className="shrink-0" />
      {showText && (
        <span className="font-semibold text-base tracking-tight group-data-[collapsible=icon]:hidden">
          ResumePilot
        </span>
      )}
    </>
  );

  const wrapperClass = cn(
    'flex items-center gap-2.5 rounded-lg p-2 -ml-2 transition-colors',
    variantClass[variant],
    className,
  );

  if (to) {
    return (
      <Link to={to} className={wrapperClass} aria-label="ResumePilot">
        {content}
      </Link>
    );
  }

  return <div className={wrapperClass}>{content}</div>;
}
