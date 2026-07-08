export type PromptSectionsInput = {
  personaPrompt: string;
  guardPrompt: string;
  taskPrompt: string;
  outputPrompt: string;
};

const PERSONA_HEADER = '[Persona · 페르소나]';
const GUARD_HEADER = '[Guard · 가드레일]';
const TASK_HEADER = '[Task · 작업]';
const OUTPUT_HEADER = '[Output · 출력]';

function joinSection(header: string, body: string): string {
  return `${header}\n${body.trim()}`;
}

export function composeSystemPrompt(sections: PromptSectionsInput): string {
  return [
    joinSection(PERSONA_HEADER, sections.personaPrompt),
    joinSection(GUARD_HEADER, sections.guardPrompt),
    joinSection(TASK_HEADER, sections.taskPrompt),
    joinSection(OUTPUT_HEADER, sections.outputPrompt),
  ].join('\n\n');
}

export const EMPTY_PROMPT_SECTIONS: PromptSectionsInput = {
  personaPrompt: '',
  guardPrompt: '',
  taskPrompt: '',
  outputPrompt: '',
};
