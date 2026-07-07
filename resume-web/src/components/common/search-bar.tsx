import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function SearchBar({ value, onChange, placeholder, className }: SearchBarProps) {
  return (
    <div className={cn('relative max-w-sm flex-1', className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8 pr-8"
        aria-label={placeholder}
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 size-9"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}
