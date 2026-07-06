import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CareerPortfolio, CareerItem, EducationItem } from '@/lib/career-portfolio';
import { emptyCareerItem, emptyEducationItem, SKILL_LEVELS } from '@/lib/career-portfolio';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  value: CareerPortfolio;
  onChange: (next: CareerPortfolio) => void;
}

export function CareerPortfolioEditor({ value, onChange }: Props) {
  const { t } = useTranslation();
  const patch = (partial: Partial<CareerPortfolio>) => onChange({ ...value, ...partial });

  return (
    <div className="space-y-8">
      <Section title={t('portfolio.careers')} subtitle={t('portfolio.careersHint')}>
        {value.careers.map((item, i) => (
          <ItemCard key={i} onRemove={() => patch({ careers: value.careers.filter((_, j) => j !== i) })}>
            <CareerFields
              item={item}
              onChange={(next) => {
                const careers = [...value.careers];
                careers[i] = next;
                patch({ careers });
              }}
            />
          </ItemCard>
        ))}
        <AddButton label={t('portfolio.addCareer')} onClick={() => patch({ careers: [...value.careers, emptyCareerItem()] })} />
      </Section>

      <Section title={t('portfolio.educations')} subtitle={t('portfolio.educationsHint')}>
        {value.educations.map((item, i) => (
          <ItemCard key={i} onRemove={() => patch({ educations: value.educations.filter((_, j) => j !== i) })}>
            <EducationFields
              item={item}
              onChange={(next) => {
                const educations = [...value.educations];
                educations[i] = next;
                patch({ educations });
              }}
            />
          </ItemCard>
        ))}
        <AddButton label={t('portfolio.addEducation')} onClick={() => patch({ educations: [...value.educations, emptyEducationItem()] })} />
      </Section>

      <Section title={t('portfolio.skills')} subtitle={t('portfolio.skillsHint')}>
        <div className="mb-3 flex flex-wrap gap-2">
          {value.skills.map((s, i) => (
            <Badge key={i} variant="secondary" className="gap-1.5 pr-1">
              {s.name}
              <button
                type="button"
                onClick={() => patch({ skills: value.skills.filter((_, j) => j !== i) })}
                className="rounded-full px-1 hover:bg-muted"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
        <Card size="sm">
          <CardContent className="grid gap-3 pt-4 sm:grid-cols-3">
            <SkillInput
              placeholder={t('portfolio.skillName')}
              onAdd={(name, level, category) => {
                if (!name.trim()) return;
                patch({ skills: [...value.skills, { name: name.trim(), level, category }] });
              }}
            />
          </CardContent>
        </Card>
      </Section>

      <Section title={t('portfolio.careerStatement')} subtitle={t('portfolio.careerStatementHint')}>
        <Textarea
          rows={8}
          value={value.careerStatement}
          onChange={(e) => patch({ careerStatement: e.target.value })}
          placeholder={t('portfolio.careerStatementPlaceholder')}
        />
      </Section>

      <Section title={t('portfolio.coverLetter')} subtitle={t('portfolio.coverLetterHint')}>
        <div className="space-y-4">
          <CoverField label={`5-1. ${t('portfolio.section51')}`} value={value.coverLetter.jobExperience} onChange={(v) => patch({ coverLetter: { ...value.coverLetter, jobExperience: v } })} />
          <CoverField label={`5-2. ${t('portfolio.section52')}`} value={value.coverLetter.collaboration} onChange={(v) => patch({ coverLetter: { ...value.coverLetter, collaboration: v } })} />
          <CoverField label={`5-3. ${t('portfolio.section53')}`} value={value.coverLetter.growthValues} onChange={(v) => patch({ coverLetter: { ...value.coverLetter, growthValues: v } })} />
          <CoverField label={`5-4. ${t('portfolio.section54')}`} value={value.coverLetter.personality} onChange={(v) => patch({ coverLetter: { ...value.coverLetter, personality: v } })} />
          <CoverField label={`5-5. ${t('portfolio.section55')}`} value={value.coverLetter.motivation} onChange={(v) => patch({ coverLetter: { ...value.coverLetter, motivation: v } })} />
        </div>
      </Section>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      {subtitle && <p className="mt-1 mb-4 text-sm text-muted-foreground">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ItemCard({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  const { t } = useTranslation();
  return (
    <Card size="sm">
      <CardContent className="pt-4">
        <div className="mb-2 flex justify-end">
          <Button variant="ghost" size="sm" className="text-destructive" onClick={onRemove}>
            {t('common.delete')}
          </Button>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="outline" className="w-full border-dashed" onClick={onClick}>
      + {label}
    </Button>
  );
}

function CareerFields({ item, onChange }: { item: CareerItem; onChange: (v: CareerItem) => void }) {
  const { t } = useTranslation();
  const set = (k: keyof CareerItem, v: string) => onChange({ ...item, [k]: v });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={t('portfolio.company')} value={item.company} onChange={(v) => set('company', v)} />
      <Field label={t('portfolio.position')} value={item.position} onChange={(v) => set('position', v)} />
      <Field label={t('portfolio.startDate')} value={item.startDate} onChange={(v) => set('startDate', v)} placeholder="2022-03" />
      <Field label={t('portfolio.endDate')} value={item.endDate} onChange={(v) => set('endDate', v)} placeholder={t('portfolio.present')} />
      <div className="sm:col-span-2 space-y-2">
        <Label>{t('portfolio.description')}</Label>
        <Textarea rows={3} value={item.description} onChange={(e) => set('description', e.target.value)} />
      </div>
    </div>
  );
}

function EducationFields({ item, onChange }: { item: EducationItem; onChange: (v: EducationItem) => void }) {
  const { t } = useTranslation();
  const set = (k: keyof EducationItem, v: string) => onChange({ ...item, [k]: v });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={t('portfolio.school')} value={item.school} onChange={(v) => set('school', v)} />
      <Field label={t('portfolio.major')} value={item.major} onChange={(v) => set('major', v)} />
      <Field label={t('portfolio.degree')} value={item.degree} onChange={(v) => set('degree', v)} />
      <Field label={t('portfolio.startDate')} value={item.startDate} onChange={(v) => set('startDate', v)} />
      <Field label={t('portfolio.endDate')} value={item.endDate} onChange={(v) => set('endDate', v)} />
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, readOnly, className = '',
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; readOnly?: boolean; className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5">{label}</Label>
      <Input readOnly={readOnly} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SkillInput({ placeholder, onAdd }: { placeholder: string; onAdd: (name: string, level: string, category: string) => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [level, setLevel] = useState('intermediate');
  const [category, setCategory] = useState('');

  return (
    <>
      <Input placeholder={placeholder} value={name} onChange={(e) => setName(e.target.value)} />
      <Select value={level} onValueChange={setLevel}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SKILL_LEVELS.map((l) => (
            <SelectItem key={l} value={l}>{t(`portfolio.skillLevel.${l}`)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-2 sm:col-span-3">
        <Input placeholder={t('portfolio.skillCategory')} value={category} onChange={(e) => setCategory(e.target.value)} />
        <Button
          type="button"
          onClick={() => {
            onAdd(name, level, category);
            setName('');
            setCategory('');
          }}
        >
          {t('common.save')}
        </Button>
      </div>
    </>
  );
}

function CoverField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm text-primary">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} />
      </CardContent>
    </Card>
  );
}
