export interface CareerItem {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface EducationItem {
  school: string;
  major: string;
  degree: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface CertificationItem {
  /** 자유 입력 텍스트 (주 입력) */
  text: string;
  /** 외부 종목 API 보강 필드 (선택) */
  name?: string;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
  credentialId?: string;
  externalCode?: string;
  matched?: boolean;
  matchSource?: string;
}

export interface SkillItem {
  name: string;
  level: string;
  category: string;
}

export interface CoverLetterSections {
  jobExperience: string;
  collaboration: string;
  growthValues: string;
  personality: string;
  motivation: string;
}

export interface CareerPortfolio {
  careers: CareerItem[];
  educations: EducationItem[];
  certifications: CertificationItem[];
  skills: SkillItem[];
  careerStatement: string;
  coverLetter: CoverLetterSections;
}

export const emptyCareerItem = (): CareerItem => ({
  company: '',
  position: '',
  startDate: '',
  endDate: '',
  description: '',
});

export const emptyEducationItem = (): EducationItem => ({
  school: '',
  major: '',
  degree: '',
  startDate: '',
  endDate: '',
  description: '',
});

export const emptyCertificationItem = (): CertificationItem => ({
  text: '',
});

export function certificationDisplayText(c: CertificationItem): string {
  return (c.text || c.name || '').trim();
}

export const emptySkillItem = (): SkillItem => ({
  name: '',
  level: 'intermediate',
  category: '',
});

export const emptyCoverLetter = (): CoverLetterSections => ({
  jobExperience: '',
  collaboration: '',
  growthValues: '',
  personality: '',
  motivation: '',
});

export const emptyCareerPortfolio = (): CareerPortfolio => ({
  careers: [],
  educations: [],
  certifications: [],
  skills: [],
  careerStatement: '',
  coverLetter: emptyCoverLetter(),
});

export function normalizeCareerPortfolio(raw?: Partial<CareerPortfolio> | null): CareerPortfolio {
  if (!raw) return emptyCareerPortfolio();
  return {
    careers: raw.careers?.length ? raw.careers : [],
    educations: raw.educations?.length ? raw.educations : [],
    certifications: (raw.certifications ?? []).map((c) => ({
      text: (c.text || c.name || '').trim(),
      name: c.name,
      issuer: c.issuer,
      issueDate: c.issueDate,
      expiryDate: c.expiryDate,
      credentialId: c.credentialId,
      externalCode: c.externalCode,
      matched: c.matched,
      matchSource: c.matchSource,
    })),
    skills: raw.skills?.length ? raw.skills : [],
    careerStatement: raw.careerStatement ?? '',
    coverLetter: { ...emptyCoverLetter(), ...raw.coverLetter },
  };
}

export function portfolioCompletion(p: CareerPortfolio): number {
  let filled = 0;
  const total = 10;
  if (p.careers.some((c) => c.company || c.position)) filled++;
  if (p.educations.some((e) => e.school)) filled++;
  if (p.certifications.some((c) => certificationDisplayText(c))) filled++;
  if (p.skills.some((s) => s.name)) filled++;
  if (p.careerStatement?.trim()) filled++;
  const cl = p.coverLetter;
  if (cl.jobExperience?.trim()) filled++;
  if (cl.collaboration?.trim()) filled++;
  if (cl.growthValues?.trim()) filled++;
  if (cl.personality?.trim()) filled++;
  if (cl.motivation?.trim()) filled++;
  return Math.round((filled / total) * 100);
}

export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
