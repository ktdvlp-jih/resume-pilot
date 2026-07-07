import { useLocation, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function PageTransition({ className }: { className?: string }) {
  const location = useLocation();

  return (
    <div
      key={location.pathname}
      className={cn('animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both', className)}
    >
      <Outlet />
    </div>
  );
}
