import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { ExperienceFlowNodeData } from '@/lib/experience-graph';
import { Badge } from '@/components/ui/badge';

type FlowNode = Node<ExperienceFlowNodeData>;

function RootNode({ data, selected }: NodeProps<FlowNode>) {
  return (
    <div
      className={cn(
        'rounded-lg border-2 border-primary bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground shadow-sm',
        selected && 'ring-2 ring-primary/40',
      )}
    >
      <Handle type="source" position={Position.Right} className="!bg-primary-foreground" />
      <span className="line-clamp-2">{data.label}</span>
    </div>
  );
}

function YearNode({ data }: NodeProps<FlowNode>) {
  return (
    <div className="rounded-md border border-border bg-muted px-3 py-2 text-center text-sm font-medium shadow-xs">
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
      {data.label}
    </div>
  );
}

function ActivityNode({ data, selected }: NodeProps<FlowNode>) {
  const { t } = useTranslation();
  const exp = data.experience;
  const expanded = Boolean(data.expanded && exp);

  if (!expanded || !exp) {
    return (
      <div
        className={cn(
          'max-w-[220px] rounded-lg border bg-card px-3 py-2.5 text-left shadow-sm transition-colors',
          selected ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50',
        )}
      >
        <Handle type="target" position={Position.Left} className="!bg-primary" />
        <p className="line-clamp-2 text-sm font-medium leading-snug">{data.label}</p>
      </div>
    );
  }

  const skills = (exp.skills ?? []).filter((s) => s.trim());
  const visibleSkills = skills.slice(0, 4);
  const extraSkills = skills.length - visibleSkills.length;

  return (
    <div
      className={cn(
        'w-[288px] rounded-lg border bg-card px-3 py-3 text-left shadow-sm transition-colors',
        selected ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50',
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-primary" />
      <p className="text-sm font-semibold leading-snug">{exp.title}</p>

      {exp.role?.trim() ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">{t('experiences.columns.role')}: </span>
          {exp.role}
        </p>
      ) : null}

      {exp.description?.trim() ? (
        <p className="mt-1.5 line-clamp-4 text-xs leading-relaxed text-muted-foreground">{exp.description}</p>
      ) : null}

      {exp.result?.trim() ? (
        <p className="mt-1.5 text-xs leading-relaxed">
          <span className="font-medium text-foreground/80">{t('experiences.resultLabel')}: </span>
          <span className="text-muted-foreground">{exp.result}</span>
        </p>
      ) : null}

      {visibleSkills.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {visibleSkills.map((skill) => (
            <Badge key={skill} variant="secondary" className="max-w-full truncate text-[10px] font-normal">
              {skill}
            </Badge>
          ))}
          {extraSkills > 0 ? (
            <Badge variant="outline" className="text-[10px] font-normal">
              +{extraSkills}
            </Badge>
          ) : null}
        </div>
      ) : null}

      <p className="mt-2 text-[10px] text-muted-foreground/80">{t('experiences.mapNodeDetailHint')}</p>
    </div>
  );
}

export const experienceNodeTypes = {
  experienceRoot: memo(RootNode),
  experienceYear: memo(YearNode),
  experienceActivity: memo(ActivityNode),
};
