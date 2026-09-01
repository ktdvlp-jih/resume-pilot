import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Maximize2, Minimize2 } from 'lucide-react';
import type { ExperienceResponse } from '@/lib/api';
import { api } from '@/lib/api';
import type { ExperienceMapDisplayMode } from '@/lib/experience-graph';
import { EmptyState } from '@/components/common/empty-state';
import { ExperienceMindMap } from '@/components/experience/experience-mind-map';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  experiences: ExperienceResponse[];
  isLoading: boolean;
  onOpenExperience?: (exp: ExperienceResponse) => void;
  onAdd: () => void;
  className?: string;
};

export function ExperiencesMapView({
  experiences,
  isLoading,
  onOpenExperience,
  onAdd,
  className,
}: Props) {
  const { t } = useTranslation();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: api.getMe });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<ExperienceMapDisplayMode>('compact');

  const rootLabel = user?.name?.trim()
    ? t('experiences.mapRootNamed', { name: user.name.trim() })
    : t('experiences.mapRootDefault');

  const handleSelect = (id: string | null) => {
    setSelectedId(id);
  };

  const handleOpenDetail = (id: string) => {
    const exp = experiences.find((e) => e.id === id);
    if (exp) onOpenExperience?.(exp);
  };

  const toggleDisplayMode = () => {
    setDisplayMode((mode) => (mode === 'expanded' ? 'compact' : 'expanded'));
  };

  if (isLoading) {
    return (
      <p className={cn('flex h-full items-center justify-center text-sm text-muted-foreground', className)}>
        {t('common.loading')}
      </p>
    );
  }

  if (experiences.length === 0) {
    return (
      <div className={cn('flex h-full items-center justify-center', className)}>
        <EmptyState
          title={t('experiences.mapEmpty')}
          description={t('experiences.emptyHint')}
          action={<Button onClick={onAdd}>{t('experiences.add')}</Button>}
        />
      </div>
    );
  }

  const expanded = displayMode === 'expanded';

  return (
    <div className={cn('relative h-full min-h-0', className)}>
      <div className="pointer-events-none absolute left-3 right-3 top-2 z-10 flex items-start justify-between gap-2">
        <p className="max-w-[min(calc(100%-8rem),24rem)] rounded-md bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
          {expanded ? t('experiences.mapHintExpanded') : t('experiences.mapHint')}
        </p>
        <Button
          type="button"
          size="sm"
          variant={expanded ? 'secondary' : 'outline'}
          className="pointer-events-auto shrink-0 shadow-sm"
          onClick={toggleDisplayMode}
        >
          {expanded ? (
            <>
              <Minimize2 className="size-3.5" aria-hidden />
              {t('experiences.mapCollapse')}
            </>
          ) : (
            <>
              <Maximize2 className="size-3.5" aria-hidden />
              {t('experiences.mapExpandAll')}
            </>
          )}
        </Button>
      </div>
      <ExperienceMindMap
        experiences={experiences}
        rootLabel={rootLabel}
        selectedExperienceId={selectedId}
        displayMode={displayMode}
        onSelectExperience={handleSelect}
        onOpenExperience={handleOpenDetail}
        className="h-full"
      />
    </div>
  );
}
