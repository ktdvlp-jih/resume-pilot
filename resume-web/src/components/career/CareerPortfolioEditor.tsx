import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  PORTFOLIO_DRAFT_ROWS_KEY,
  readUserScopedItem,
  writeUserScopedItem,
} from '@/lib/user-storage';
import type { CareerPortfolio, CareerItem, EducationItem, CertificationItem } from '@/lib/career-portfolio';
import { emptyCareerItem, emptyEducationItem, emptyCertificationItem, SKILL_LEVELS, certificationDisplayText } from '@/lib/career-portfolio';
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
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';

type PortfolioSectionType =
  | 'CAREER_STATEMENT'
  | 'JOB_EXPERIENCE'
  | 'COLLABORATION'
  | 'GROWTH_VALUES'
  | 'PERSONALITY'
  | 'MOTIVATION';

type PortfolioReviewResult = Awaited<ReturnType<typeof api.reviewPortfolio>>;

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

      <Section
        title={t('portfolio.certifications')}
        subtitle={t('portfolio.certificationsHint')}
        action={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1 text-primary"
            onClick={() => {
              patch({ certifications: [...value.certifications, emptyCertificationItem()] });
            }}
          >
            <Plus className="size-3.5" />
            {t('portfolio.addCertification')}
          </Button>
        }
      >
        <CertificationList
          items={value.certifications}
          onChange={(certifications) => patch({ certifications })}
        />
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
        <SkillPicker
          existing={value.skills.map((s) => s.name)}
          onAdd={(items) => patch({ skills: [...value.skills, ...items] })}
        />
      </Section>

      <Section title={t('portfolio.careerStatement')} subtitle={t('portfolio.careerStatementHint')}>
        <ReviewableDraft
          sectionType="CAREER_STATEMENT"
          value={value.careerStatement}
          onChange={(v) => patch({ careerStatement: v })}
          placeholder={t('portfolio.careerStatementPlaceholder')}
        />
      </Section>

      <Section title={t('portfolio.coverLetter')} subtitle={t('portfolio.coverLetterHint')}>
        <div className="space-y-4">
          <CoverField
            label={`5-1. ${t('portfolio.section51')}`}
            sectionType="JOB_EXPERIENCE"
            value={value.coverLetter.jobExperience}
            onChange={(v) => patch({ coverLetter: { ...value.coverLetter, jobExperience: v } })}
          />
          <CoverField
            label={`5-2. ${t('portfolio.section52')}`}
            sectionType="COLLABORATION"
            value={value.coverLetter.collaboration}
            onChange={(v) => patch({ coverLetter: { ...value.coverLetter, collaboration: v } })}
          />
          <CoverField
            label={`5-3. ${t('portfolio.section53')}`}
            sectionType="GROWTH_VALUES"
            value={value.coverLetter.growthValues}
            onChange={(v) => patch({ coverLetter: { ...value.coverLetter, growthValues: v } })}
          />
          <CoverField
            label={`5-4. ${t('portfolio.section54')}`}
            sectionType="PERSONALITY"
            value={value.coverLetter.personality}
            onChange={(v) => patch({ coverLetter: { ...value.coverLetter, personality: v } })}
          />
          <CoverField
            label={`5-5. ${t('portfolio.section55')}`}
            sectionType="MOTIVATION"
            value={value.coverLetter.motivation}
            onChange={(v) => patch({ coverLetter: { ...value.coverLetter, motivation: v } })}
          />
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-1 flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        {action}
      </div>
      {subtitle && <p className="mb-4 text-sm text-muted-foreground">{subtitle}</p>}
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

function CertificationList({
  items,
  onChange,
}: {
  items: CertificationItem[];
  onChange: (next: CertificationItem[]) => void;
}) {
  const { t } = useTranslation();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    const emptyIdx = items.findIndex((c) => !certificationDisplayText(c));
    if (emptyIdx >= 0) setEditingIndex(emptyIdx);
  }, [items]);

  const updateAt = (index: number, next: CertificationItem) => {
    const certifications = [...items];
    certifications[index] = next;
    onChange(certifications);
  };

  const removeAt = (index: number) => {
    onChange(items.filter((_, j) => j !== index));
    setEditingIndex((prev) => {
      if (prev == null) return null;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    setEditingIndex((prev) => {
      if (prev === index) return target;
      if (prev === target) return index;
      return prev;
    });
  };

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {t('portfolio.emptyCertifications')}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {items.map((item, i) => {
        const title = certificationDisplayText(item);
        const isEditing = editingIndex === i || !title;
        return (
          <div
            key={i}
            className={i === 0 ? '' : 'border-t border-border'}
          >
            {isEditing ? (
              <div className="space-y-3 p-4">
                <CertificationFields
                  item={item}
                  compact
                  onChange={(next) => updateAt(i, next)}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Field
                    label={t('portfolio.issueDate')}
                    value={item.issueDate ?? ''}
                    onChange={(v) => updateAt(i, { ...item, issueDate: v })}
                    placeholder="2022-03"
                    className="min-w-[140px] flex-1"
                  />
                  <div className="ml-auto flex gap-1 pt-5">
                    <Button
                      type="button"
                      size="sm"
                      disabled={!certificationDisplayText(item)}
                      onClick={() => setEditingIndex(null)}
                    >
                      {t('common.done')}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => removeAt(i)}>
                      {t('common.delete')}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 px-3 py-3.5 sm:px-4">
                <div className="mt-0.5 flex flex-col gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-7 text-muted-foreground"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    aria-label={t('common.moveUp')}
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-7 text-muted-foreground"
                    disabled={i === items.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label={t('common.moveDown')}
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-semibold">{title}</span>
                    {item.issueDate ? (
                      <span className="text-muted-foreground">
                        {' '}| {item.issueDate}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {item.issuer
                      || (item.matched ? t('portfolio.certMatchedBadge', { name: item.name || title }) : t('portfolio.certFreeText'))}
                  </p>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-8"
                    onClick={() => setEditingIndex(i)}
                    aria-label={t('common.edit')}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-8 text-destructive"
                    onClick={() => removeAt(i)}
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CertificationFields({
  item,
  onChange,
  compact = false,
}: {
  item: CertificationItem;
  onChange: (v: CertificationItem) => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const text = certificationDisplayText(item) || item.text || '';
  const [open, setOpen] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [matches, setMatches] = useState<Array<{
    name: string;
    seriesName?: string;
    qualTypeName?: string;
    issuer: string;
    externalCode?: string;
    matchSource: string;
  }>>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    api.getCertificationLookupStatus()
      .then((s) => { if (!cancelled) setConfigured(s.configured); })
      .catch(() => { if (!cancelled) setConfigured(false); });
    return () => { cancelled = true; };
  }, []);

  const updateMenuPos = () => {
    const el = inputWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  };

  useLayoutEffect(() => {
    if (!open || matches.length === 0) {
      setMenuPos(null);
      return;
    }
    updateMenuPos();
    const onReposition = () => updateMenuPos();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, matches.length, text]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (inputWrapRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    const q = text.trim();
    if (!q || configured === false) {
      setMatches([]);
      setLookupLoading(false);
      return;
    }
    if (configured === null) return;
    if (item.matched && item.name === q) {
      setMatches([]);
      setOpen(false);
      return;
    }

    const reqId = ++reqIdRef.current;
    setLookupLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await api.lookupCertification(q);
        if (reqId !== reqIdRef.current) return;
        if (!res.configured) {
          setConfigured(false);
          setMatches([]);
          return;
        }
        setConfigured(true);
        const next = res.success ? (res.matches ?? []) : [];
        setMatches(next);
        setOpen(next.length > 0);
      } catch {
        if (reqId === reqIdRef.current) setMatches([]);
      } finally {
        if (reqId === reqIdRef.current) setLookupLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [text, configured, item.matched, item.name]);

  const selectMatch = (m: (typeof matches)[number]) => {
    onChange({
      ...item,
      text: m.name,
      name: m.name,
      issuer: m.issuer,
      externalCode: m.externalCode,
      matched: true,
      matchSource: m.matchSource,
    });
    setMatches([]);
    setOpen(false);
  };

  const showMenu = open && matches.length > 0 && menuPos;

  return (
    <div className="space-y-2">
      {!compact ? <Label>{t('portfolio.certText')}</Label> : null}
      <div ref={inputWrapRef} className="relative">
        <Input
          value={text}
          placeholder={t('portfolio.certTextPlaceholder')}
          autoComplete="off"
          onFocus={() => {
            if (matches.length > 0) setOpen(true);
          }}
          onChange={(e) =>
            onChange({
              ...item,
              text: e.target.value,
              matched: false,
              matchSource: undefined,
              externalCode: undefined,
              name: undefined,
              issuer: undefined,
            })
          }
        />
        {lookupLoading ? (
          <Loader2 className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>
      {showMenu
        ? createPortal(
            <div
              ref={menuRef}
              style={{
                position: 'fixed',
                top: menuPos.top,
                left: menuPos.left,
                width: menuPos.width,
                maxHeight: 312,
              }}
              className="z-50 overflow-y-auto rounded-lg border border-input bg-popover p-1 shadow-md"
            >
              <ul>
                {matches.map((m) => (
                  <li key={`${m.externalCode ?? ''}-${m.name}`}>
                    <button
                      type="button"
                      className="flex w-full flex-col items-start gap-0.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectMatch(m)}
                    >
                      <span className="font-medium">{m.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {[m.qualTypeName, m.seriesName, m.issuer].filter(Boolean).join(' · ')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>,
            document.body,
          )
        : null}
      {!compact ? <p className="text-xs text-muted-foreground">{t('portfolio.certTextHint')}</p> : null}
      {item.matched && item.name ? (
        <Badge variant="secondary" className="font-normal">
          {t('portfolio.certMatchedBadge', { name: item.name })}
        </Badge>
      ) : null}
      {configured === false ? (
        <p className="text-xs text-muted-foreground">{t('portfolio.certLookupNotConfigured')}</p>
      ) : null}
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

interface PickableSkill {
  name: string;
  level: string;
  category: string;
}

function SkillPicker({ existing, onAdd }: { existing: string[]; onAdd: (items: PickableSkill[]) => void }) {
  const { t } = useTranslation();
  const { data: catalog = [] } = useQuery({ queryKey: ['skill-catalog'], queryFn: api.getSkillCatalog });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [levels, setLevels] = useState<Record<string, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const existingLower = new Set(existing.map((n) => n.toLowerCase()));
  const filtered = catalog.filter(
    (s) => !existingLower.has(s.name.toLowerCase()) && s.name.toLowerCase().includes(query.toLowerCase()),
  );

  const toggle = (name: string) => {
    setLevels((prev) => {
      const next = { ...prev };
      if (next[name]) delete next[name];
      else next[name] = 'intermediate';
      return next;
    });
  };

  const selectedCount = Object.keys(levels).length;

  const commit = () => {
    const items = catalog
      .filter((s) => levels[s.name])
      .map((s) => ({ name: s.name, level: levels[s.name], category: s.category }));
    if (items.length === 0) return;
    onAdd(items);
    setLevels({});
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative mb-2">
      <Input
        placeholder={t('portfolio.skillSearchPlaceholder')}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
      />
      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-input bg-popover shadow-md">
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="p-3 text-center text-sm text-muted-foreground">{t('portfolio.noSkillMatches')}</p>
            ) : (
              filtered.map((s) => (
                <label
                  key={s.name}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!levels[s.name]}
                      onChange={() => toggle(s.name)}
                      className="size-4 rounded border-input"
                    />
                    {s.name}
                    <span className="text-xs text-muted-foreground">{s.category}</span>
                  </span>
                  {levels[s.name] && (
                    <span onClick={(e) => e.preventDefault()}>
                      <Select value={levels[s.name]} onValueChange={(v) => setLevels((prev) => ({ ...prev, [s.name]: v }))}>
                        <SelectTrigger className="h-7 w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SKILL_LEVELS.map((l) => (
                            <SelectItem key={l} value={l}>{t(`portfolio.skillLevel.${l}`)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </span>
                  )}
                </label>
              ))
            )}
          </div>
          <div className="flex items-center justify-between border-t border-input p-2">
            <span className="text-xs text-muted-foreground">
              {t('portfolio.selectedCount', { count: selectedCount })}
            </span>
            <Button type="button" size="sm" disabled={selectedCount === 0} onClick={commit}>
              {t('portfolio.addSelected')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CoverField({
  label,
  sectionType,
  value,
  onChange,
}: {
  label: string;
  sectionType: PortfolioSectionType;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm text-primary">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <ReviewableDraft sectionType={sectionType} value={value} onChange={onChange} />
      </CardContent>
    </Card>
  );
}

const DRAFT_ROWS_STORAGE_KEY = PORTFOLIO_DRAFT_ROWS_KEY;
const DRAFT_ROWS_MIN = 6;
const DRAFT_ROWS_MAX = 60;

const DEFAULT_DRAFT_ROWS: Record<PortfolioSectionType, number> = {
  CAREER_STATEMENT: 20,
  JOB_EXPERIENCE: 14,
  COLLABORATION: 14,
  GROWTH_VALUES: 14,
  PERSONALITY: 12,
  MOTIVATION: 12,
};

function clampDraftRows(n: number): number {
  if (!Number.isFinite(n)) return DRAFT_ROWS_MIN;
  return Math.min(DRAFT_ROWS_MAX, Math.max(DRAFT_ROWS_MIN, Math.round(n)));
}

function readStoredDraftRows(sectionType: PortfolioSectionType): number | null {
  try {
    const raw = readUserScopedItem(DRAFT_ROWS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const value = parsed[sectionType];
    return typeof value === 'number' ? clampDraftRows(value) : null;
  } catch {
    return null;
  }
}

function writeStoredDraftRows(sectionType: PortfolioSectionType, rows: number) {
  try {
    const raw = readUserScopedItem(DRAFT_ROWS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    parsed[sectionType] = rows;
    writeUserScopedItem(DRAFT_ROWS_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore quota / private mode
  }
}

function countDraftLines(text: string): number {
  if (!text) return 0;
  return text.split(/\r\n|\r|\n/).length;
}

function ReviewableDraft({
  sectionType,
  value,
  onChange,
  placeholder,
}: {
  sectionType: PortfolioSectionType;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const { t } = useTranslation();
  const [rows, setRows] = useState(
    () => readStoredDraftRows(sectionType) ?? DEFAULT_DRAFT_ROWS[sectionType],
  );
  const [result, setResult] = useState<PortfolioReviewResult | null>(null);
  const mutation = useMutation({
    mutationFn: () => api.reviewPortfolio(sectionType, value),
    onSuccess: (data) => setResult(data),
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t('portfolio.reviewFailed'));
    },
  });

  const lineCount = countDraftLines(value);
  const charCount = value.length;

  const updateRows = (next: number) => {
    const clamped = clampDraftRows(next);
    setRows(clamped);
    writeStoredDraftRows(sectionType, clamped);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{t('portfolio.draftRowsLabel')}</span>
          <Input
            type="number"
            min={DRAFT_ROWS_MIN}
            max={DRAFT_ROWS_MAX}
            value={rows}
            onChange={(e) => updateRows(Number(e.target.value))}
            className="h-8 w-20"
            aria-label={t('portfolio.draftRowsLabel')}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          {t('portfolio.draftLengthStats', { lines: lineCount, chars: charCount })}
        </p>
      </div>
      <Textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-40 text-sm leading-relaxed"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              {t('portfolio.reviewRunning')}
            </>
          ) : (
            t('portfolio.reviewAgainstExperiences')
          )}
        </Button>
        <p className="text-xs text-muted-foreground">{t('portfolio.reviewHint')}</p>
      </div>
      {result && <PortfolioReviewPanel result={result} />}
    </div>
  );
}

function PortfolioReviewPanel({ result }: { result: PortfolioReviewResult }) {
  const { t } = useTranslation();
  const relevant = result.relevant_experiences ?? [];
  const unused = result.unused_experiences ?? [];
  const unsupported = result.unsupported_claims ?? [];
  const directions = result.revision_directions ?? [];
  const empty =
    relevant.length === 0 &&
    unused.length === 0 &&
    unsupported.length === 0 &&
    directions.length === 0;

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3 text-sm">
      {empty ? (
        <p className="text-muted-foreground">{t('portfolio.reviewEmpty')}</p>
      ) : (
        <>
          {relevant.length > 0 && (
            <ReviewBlock title={t('portfolio.reviewRelevant')}>
              <ul className="list-disc space-y-1 pl-4">
                {relevant.map((item, i) => (
                  <li key={item.id || i}>
                    <span className="font-medium">{item.title || item.id}</span>
                    {item.why_fits ? ` — ${item.why_fits}` : ''}
                  </li>
                ))}
              </ul>
            </ReviewBlock>
          )}
          {unused.length > 0 && (
            <ReviewBlock title={t('portfolio.reviewUnused')}>
              <ul className="list-disc space-y-1 pl-4">
                {unused.map((item, i) => (
                  <li key={item.id || i}>
                    <span className="font-medium">{item.title || item.id}</span>
                    {item.reason ? ` — ${item.reason}` : ''}
                  </li>
                ))}
              </ul>
            </ReviewBlock>
          )}
          {unsupported.length > 0 && (
            <ReviewBlock title={t('portfolio.reviewUnsupported')}>
              <ul className="list-disc space-y-1 pl-4">
                {unsupported.map((item, i) => (
                  <li key={i}>
                    <span className="font-medium">{item.claim}</span>
                    {item.reason ? ` — ${item.reason}` : ''}
                  </li>
                ))}
              </ul>
            </ReviewBlock>
          )}
          {directions.length > 0 && (
            <ReviewBlock title={t('portfolio.reviewDirections')}>
              <ul className="list-disc space-y-1 pl-4">
                {directions.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </ReviewBlock>
          )}
        </>
      )}
    </div>
  );
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 font-medium text-foreground">{title}</p>
      {children}
    </div>
  );
}
