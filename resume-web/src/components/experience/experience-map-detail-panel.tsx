import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ExperienceResponse } from '@/lib/api';
import { experienceReadiness } from '@/lib/experience-limits';
import { StatusChip } from '@/components/common/status-chip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

type Props = {
  experience: ExperienceResponse | null;
  onEdit?: (exp: ExperienceResponse) => void;
  onCoach?: (exp: ExperienceResponse) => void;
  className?: string;
};

function formatDate(iso?: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${y}. ${m}. ${d}.`;
}

export function ExperienceMapDetailPanel({ experience, onEdit, onCoach, className }: Props) {
  const { t } = useTranslation();

  if (!experience) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">{t('experiences.mapDetailTitle')}</CardTitle>
          <CardDescription>{t('experiences.mapDetailHint')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const readiness = experienceReadiness(experience);
  const readinessPct = readiness === 'ready' ? 100 : readiness === 'thin' ? 55 : 20;

  return (
    <Card className={className}>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip
            label={t(`experienceType.${experience.type}`, { defaultValue: experience.type })}
            variant="primary"
          />
          <StatusChip
            label={t(`experiences.readiness.${readiness}`)}
            variant={readiness === 'ready' ? 'success' : readiness === 'thin' ? 'warning' : 'default'}
          />
        </div>
        <CardTitle className="text-lg leading-snug">{experience.title}</CardTitle>
        <CardDescription>
          {formatDate(experience.startDate)} — {experience.endDate ? formatDate(experience.endDate) : t('portfolio.present')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {experience.role && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">{t('experiences.columns.role')}</p>
            <p className="text-sm">{experience.role}</p>
          </div>
        )}
        {experience.description && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">{t('experiences.descriptionPlaceholder')}</p>
            <p className="text-sm text-pretty whitespace-pre-wrap">{experience.description}</p>
          </div>
        )}
        {experience.result && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">{t('experiences.resultLabel')}</p>
            <p className="text-sm">{experience.result}</p>
          </div>
        )}
        {(experience.skills?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {experience.skills.map((skill) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
        )}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t('experiences.readinessLabel')}</span>
            <span>{t(`experiences.readiness.${readiness}`)}</span>
          </div>
          <Progress value={readinessPct} className="h-1.5" />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {onCoach && experience && (
            <Button type="button" size="sm" onClick={() => onCoach(experience)}>
              {t('experiences.chatContinue')}
            </Button>
          )}
          {onEdit && (
            <Button type="button" size="sm" variant="secondary" onClick={() => onEdit(experience)}>
              {t('common.edit')}
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" asChild>
            <Link to="/workspace">{t('nav.workspace')}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
