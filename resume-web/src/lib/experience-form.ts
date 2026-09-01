import type { ExperienceResponse } from '@/lib/api';
import { EXPERIENCE_FIELD_LIMITS } from '@/lib/experience-limits';

export type ExperienceForm = {
  type: string;
  title: string;
  description: string;
  role: string;
  result: string;
  contribution: string;
  numericResult: string;
  starSituation: string;
  starTask: string;
  starAction: string;
  starResult: string;
  startDate: string;
  endDate: string;
  ongoing: boolean;
};

export function emptyExperienceForm(): ExperienceForm {
  return {
    type: 'PROJECT',
    title: '',
    description: '',
    role: '',
    result: '',
    contribution: '',
    numericResult: '',
    starSituation: '',
    starTask: '',
    starAction: '',
    starResult: '',
    startDate: '',
    endDate: '',
    ongoing: false,
  };
}

export function experienceToForm(exp: ExperienceResponse): ExperienceForm {
  return {
    type: exp.type,
    title: exp.title,
    description: exp.description ?? '',
    role: exp.role ?? '',
    result: exp.result ?? '',
    contribution: exp.contribution ?? '',
    numericResult: exp.numericResult ?? '',
    starSituation: exp.starSituation ?? '',
    starTask: exp.starTask ?? '',
    starAction: exp.starAction ?? '',
    starResult: exp.starResult ?? '',
    startDate: exp.startDate ?? '',
    endDate: exp.endDate ?? '',
    ongoing: !exp.endDate,
  };
}

export function payloadFromExperienceForm(form: ExperienceForm) {
  return {
    type: form.type,
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    role: form.role.trim() || undefined,
    result: form.result.trim() || undefined,
    contribution: form.contribution.trim() || undefined,
    numericResult: form.numericResult.trim() || undefined,
    starSituation: form.starSituation.trim() || undefined,
    starTask: form.starTask.trim() || undefined,
    starAction: form.starAction.trim() || undefined,
    starResult: form.starResult.trim() || undefined,
    startDate: form.startDate || undefined,
    endDate: form.ongoing ? undefined : form.endDate || undefined,
    ongoing: form.ongoing,
  };
}

export function isExperienceFormOverLimit(form: ExperienceForm): boolean {
  return (
    form.title.length > EXPERIENCE_FIELD_LIMITS.title ||
    form.description.length > EXPERIENCE_FIELD_LIMITS.description ||
    form.role.length > EXPERIENCE_FIELD_LIMITS.role ||
    form.result.length > EXPERIENCE_FIELD_LIMITS.result ||
    form.contribution.length > EXPERIENCE_FIELD_LIMITS.contribution ||
    form.numericResult.length > EXPERIENCE_FIELD_LIMITS.numericResult ||
    form.starSituation.length > EXPERIENCE_FIELD_LIMITS.star ||
    form.starTask.length > EXPERIENCE_FIELD_LIMITS.star ||
    form.starAction.length > EXPERIENCE_FIELD_LIMITS.star ||
    form.starResult.length > EXPERIENCE_FIELD_LIMITS.star
  );
}
