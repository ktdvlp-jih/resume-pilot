export type SpellIssue = { id: string; messageKey: string };

export function lintKoreanDraft(text: string): SpellIssue[] {
  const issues: SpellIssue[] = [];
  if (!text.trim()) return issues;
  if (/ {2,}/.test(text)) issues.push({ id: 'spaces', messageKey: 'tools.spell.repeatSpaces' });
  if (/[!?]{3,}|\.{4,}|,{2,}/.test(text)) issues.push({ id: 'punct', messageKey: 'tools.spell.repeatPunct' });
  const commaCount = (text.match(/,/g) ?? []).length;
  if (commaCount >= 8 && text.length < 1200) {
    issues.push({ id: 'commas', messageKey: 'tools.spell.tooManyCommas' });
  }
  if (/(에 대해|통해|되어진다|것이라고 생각)/.test(text)) {
    issues.push({ id: 'calque', messageKey: 'tools.spell.calque' });
  }
  return issues;
}
