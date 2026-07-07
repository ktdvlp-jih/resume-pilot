import { useTranslation } from 'react-i18next';
import { Check, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DraftSaveStatus } from '@/hooks/use-workspace-draft';

export function AutosaveIndicator({
  status,
  className,
}: {
  status: DraftSaveStatus;
  className?: string;
}) {
  const { t } = useTranslation();

  if (status === 'idle') return null;

  const saving = status === 'saving';

  return (
    <span
      data-testid="workspace-autosave"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground',
        className,
      )}
    >
      {saving ? <Cloud className="size-3.5 animate-pulse" /> : <Check className="size-3.5 text-success" />}
      {saving ? t('workspace.draftSaving') : t('workspace.draftSaved')}
    </span>
  );
}
