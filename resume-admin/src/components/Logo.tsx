import { cn } from '@/lib/utils';

interface LogoMarkProps {
  size?: number;
  className?: string;
}

/** 단일 소스: logo-mark.png (resume-web과 동일) */
export function LogoMark({ size = 32, className = '' }: LogoMarkProps) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}logo-mark.png`}
      width={size}
      height={size}
      alt=""
      aria-hidden
      className={cn('shrink-0 rounded-[22%]', className)}
      draggable={false}
    />
  );
}
