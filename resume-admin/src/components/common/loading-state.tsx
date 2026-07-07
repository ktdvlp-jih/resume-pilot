import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LoadingSpinner({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground', className)}>
      <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}
