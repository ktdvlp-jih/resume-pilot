import { cn } from '@/lib/utils';
import { MAX_EXPERIENCES_PER_SECTION } from '@/lib/section-experiences';

type PoolItem = { id: string; title: string };

export function SectionExperiencePicker({
  pool,
  assignedIds,
  disabled,
  emptyLabel,
  countLabel,
  max = MAX_EXPERIENCES_PER_SECTION,
  onToggle,
}: {
  pool: PoolItem[];
  assignedIds: string[];
  disabled?: boolean;
  emptyLabel: string;
  countLabel: string;
  max?: number;
  onToggle: (id: string) => void;
}) {
  const assigned = new Set(assignedIds);
  const cap = Math.min(MAX_EXPERIENCES_PER_SECTION, Math.max(1, max));

  if (pool.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs tabular-nums text-muted-foreground">{countLabel}</p>
      <div className="flex flex-wrap gap-1.5">
        {pool.map((item) => {
          const on = assigned.has(item.id);
          const atLimit = !on && assignedIds.length >= cap;
          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled || atLimit}
              aria-pressed={on}
              onClick={() => onToggle(item.id)}
              className={cn(
                'max-w-full truncate rounded-md border px-2 py-1 text-left text-xs transition-colors',
                on
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted',
                (disabled || atLimit) && !on && 'cursor-not-allowed opacity-50',
              )}
            >
              {item.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}
