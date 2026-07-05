import { Link } from 'react-router-dom';

interface LogoMarkProps {
  size?: number;
  className?: string;
}

/** ResumePilot 로고 마크 — 문서 + 파일럿(날개) */
export function LogoMark({ size = 32, className = '' }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="rp-logo-bg" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7c3aed" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id="rp-logo-wing" x1="22" y1="10" x2="34" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c4b5fd" />
          <stop offset="1" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#rp-logo-bg)" />
      <path
        fill="#fff"
        fillOpacity=".95"
        d="M11 12.5a1.5 1.5 0 0 1 1.5-1.5h11a1.5 1.5 0 0 1 1.5 1.5v15a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 11 27.5v-15Z"
      />
      <path stroke="#7c3aed" strokeWidth="1.4" strokeLinecap="round" d="M14.5 16h9M14.5 20h9M14.5 24h6" />
      <path fill="url(#rp-logo-wing)" d="M22.2 9.2 31.8 11.8 28.4 21.4 18.8 18.8z" />
      <circle cx="27.5" cy="12.5" r="1.2" fill="#fff" />
    </svg>
  );
}

interface LogoProps {
  to?: string;
  showText?: boolean;
}

export function Logo({ to = '/dashboard', showText = true }: LogoProps) {
  const content = (
    <>
      <LogoMark size={34} className="shrink-0" />
      {showText && (
        <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
          ResumePilot
        </span>
      )}
    </>
  );

  if (to) {
    return (
      <Link to={to} className="ui-brand" aria-label="ResumePilot 홈">
        {content}
      </Link>
    );
  }

  return <div className="ui-brand-static flex items-center gap-2.5">{content}</div>;
}
