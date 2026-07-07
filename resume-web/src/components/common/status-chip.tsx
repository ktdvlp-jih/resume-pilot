import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const variants = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning-foreground',
  destructive: 'bg-destructive/10 text-destructive',
} as const;

type StatusChipProps = {
  label: string;
  variant?: keyof typeof variants;
  className?: string;
};

export function StatusChip({ label, variant = 'default', className }: StatusChipProps) {
  return (
    <Badge variant="outline" className={cn('border-transparent font-normal', variants[variant], className)}>
      {label}
    </Badge>
  );
}
