import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CareerPortfolio, CareerItem, EducationItem } from '../../lib/career-portfolio';
import {
  emptyCareerItem,
  emptyEducationItem,
  SKILL_LEVELS,
} from '../../lib/career-portfolio';

const inputClass =
  'w-full px-3 py-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white/80 dark:bg-zinc-900/80 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition';
const textareaClass = `${inputClass} resize-y min-h-[100px]`;
const labelClass = 'text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block';
const cardClass =
  'rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm p-5 shadow-sm';

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
          <ItemCard
            key={i}
            onRemove={() => patch({ careers: value.careers.filter((_, j) => j !== i) })}
          >
            <CareerFields item={item} onChange={(next) => {
              const careers = [...value.careers];
              careers[i] = next;
              patch({ careers });
            }} />
          </ItemCard>
        ))}
        <AddButton label={t('portfolio.addCareer')} onClick={() => patch({ careers: [...value.careers, emptyCareerItem()] })} />
      </Section>

      <Section title={t('portfolio.educations')} subtitle={t('portfolio.educationsHint')}>
        {value.educations.map((item, i) => (
          <ItemCard
            key={i}
            onRemove={() => patch({ educations: value.educations.filter((_, j) => j !== i) })}
          >
            <EducationFields item={item} onChange={(next) => {
              const educations = [...value.educations];
              educations[i] = next;
              patch({ educations });
            }} />
          </ItemCard>
        ))}
        <AddButton label={t('portfolio.addEducation')} onClick={() => patch({ educations: [...value.educations, emptyEducationItem()] })} />
      </Section>

      <Section title={t('portfolio.skills')} subtitle={t('portfolio.skillsHint')}>
        <div className="flex flex-wrap gap-2 mb-3">
          {value.skills.map((s, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full text-sm bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20"
            >
              {s.name}
              <button
                type="button"
                onClick={() => patch({ skills: value.skills.filter((_, j) => j !== i) })}
                className="w-5 h-5 rounded-full hover:bg-violet-500/20 text-xs"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className={`${cardClass} grid sm:grid-cols-3 gap-3`}>
          <SkillInput
            placeholder={t('portfolio.skillName')}
            onAdd={(name, level, category) => {
              if (!name.trim()) return;
              patch({ skills: [...value.skills, { name: name.trim(), level, category }] });
            }}
          />
        </div>
      </Section>

      <Section title={t('portfolio.careerStatement')} subtitle={t('portfolio.careerStatementHint')}>
        <textarea
          className={textareaClass}
          rows={8}
          value={value.careerStatement}
          onChange={(e) => patch({ careerStatement: e.target.value })}
          placeholder={t('portfolio.careerStatementPlaceholder')}
        />
      </Section>

      <Section title={t('portfolio.coverLetter')} subtitle={t('portfolio.coverLetterHint')}>
        <div className="space-y-4">
          <CoverField
            label={`5-1. ${t('portfolio.section51')}`}
            value={value.coverLetter.jobExperience}
            onChange={(v) => patch({ coverLetter: { ...value.coverLetter, jobExperience: v } })}
          />
          <CoverField
            label={`5-2. ${t('portfolio.section52')}`}
            value={value.coverLetter.collaboration}
            onChange={(v) => patch({ coverLetter: { ...value.coverLetter, collaboration: v } })}
          />
          <CoverField
            label={`5-3. ${t('portfolio.section53')}`}
            value={value.coverLetter.growthValues}
            onChange={(v) => patch({ coverLetter: { ...value.coverLetter, growthValues: v } })}
          />
          <CoverField
            label={`5-4. ${t('portfolio.section54')}`}
            value={value.coverLetter.personality}
            onChange={(v) => patch({ coverLetter: { ...value.coverLetter, personality: v } })}
          />
          <CoverField
            label={`5-5. ${t('portfolio.section55')}`}
            value={value.coverLetter.motivation}
            onChange={(v) => patch({ coverLetter: { ...value.coverLetter, motivation: v } })}
          />
        </div>
      </Section>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      {subtitle && <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ItemCard({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  const { t } = useTranslation();
  return (
    <div className={cardClass}>
      <div className="flex justify-end mb-2">
        <button type="button" onClick={onRemove} className="text-xs text-red-500 hover:text-red-400">
          {t('common.delete')}
        </button>
      </div>
      {children}
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full py-2.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 text-sm text-zinc-600 dark:text-zinc-400 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-300 transition"
    >
      + {label}
    </button>
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
      <div className="sm:col-span-2">
        <label className={labelClass}>{t('portfolio.description')}</label>
        <textarea className={textareaClass} rows={3} value={item.description} onChange={(e) => set('description', e.target.value)} />
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
      <label className={labelClass}>{label}</label>
      <input readOnly={readOnly} className={inputClass} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} />
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
      <input className={inputClass} placeholder={placeholder} value={name} onChange={(e) => setName(e.target.value)} />
      <select className={inputClass} value={level} onChange={(e) => setLevel(e.target.value)}>
        {SKILL_LEVELS.map((l) => (
          <option key={l} value={l}>{t(`portfolio.skillLevel.${l}`)}</option>
        ))}
      </select>
      <div className="flex gap-2">
        <input className={inputClass} placeholder={t('portfolio.skillCategory')} value={category} onChange={(e) => setCategory(e.target.value)} />
        <button
          type="button"
          onClick={() => { onAdd(name, level, category); setName(''); setCategory(''); }}
          className="shrink-0 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm hover:bg-violet-500"
        >
          {t('common.save')}
        </button>
      </div>
    </>
  );
}

function CoverField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className={cardClass}>
      <label className="text-sm font-medium text-violet-600 dark:text-violet-400 mb-2 block">{label}</label>
      <textarea className={textareaClass} rows={4} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
