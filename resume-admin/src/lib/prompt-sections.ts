export type PromptSectionsInput = {
  personaPrompt: string;
  guardPrompt: string;
  skillPrompt?: string;
  rubricPrompt?: string;
  taskPrompt: string;
  outputPrompt: string;
};

const PERSONA_HEADER = '[Persona · 페르소나]';
const GUARD_HEADER = '[Guard · 가드레일]';
const SKILL_HEADER = '[Skill · 스킬]';
const RUBRIC_HEADER = '[Rubric · 자소서 문체]';
const TASK_HEADER = '[Task · 작업]';
const OUTPUT_HEADER = '[Output · 출력]';

function joinSection(header: string, body: string): string {
  return `${header}\n${body.trim()}`;
}

export function composeSystemPrompt(sections: PromptSectionsInput): string {
  const parts = [
    joinSection(PERSONA_HEADER, sections.personaPrompt),
    joinSection(GUARD_HEADER, sections.guardPrompt),
  ];
  if (sections.skillPrompt?.trim()) {
    parts.push(joinSection(SKILL_HEADER, sections.skillPrompt));
  }
  if (sections.rubricPrompt?.trim()) {
    parts.push(joinSection(RUBRIC_HEADER, sections.rubricPrompt));
  }
  parts.push(joinSection(TASK_HEADER, sections.taskPrompt));
  parts.push(joinSection(OUTPUT_HEADER, sections.outputPrompt));
  return parts.join('\n\n');
}

export const EMPTY_PROMPT_SECTIONS: PromptSectionsInput = {
  personaPrompt: '',
  guardPrompt: '',
  skillPrompt: '',
  rubricPrompt: '',
  taskPrompt: '',
  outputPrompt: '',
};
