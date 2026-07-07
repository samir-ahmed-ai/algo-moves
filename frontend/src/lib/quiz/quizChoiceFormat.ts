import {
  BAD_HEADLINE_END,
  COMMA_BEFORE_DASH,
  GENERIC_DETAILS,
  MIDWORD_ELLIPSIS,
} from './quizLabelRules';

const DETAIL_MAX = 60;
const CODE_HEADLINE_PATTERN = /^[\w\s.+\-*/()%[\]{}<>=!&|?:]+$/;
const CODE_SYMBOL_PATTERN = /[()[\]{}.=+\-*/%<>!&|?:]/;
const CODE_WORD_PATTERN =
  /^(?:i|j|k|lo|hi|mid|left|right|curr|prev|next|node|root|head|tail|null|true|false)$/i;

export interface ParsedQuizChoiceLabel {
  headline: string;
  detail?: string;
}

/** Split "headline — detail" without breaking formulas like `(i - 1) / 2`. */
export function parseQuizChoiceLabel(label: string): ParsedQuizChoiceLabel {
  const trimmed = label.trim();
  const match = trimmed.match(/^(.+?)\s+[—–]\s+(.+)$/);
  if (!match) return { headline: trimmed };

  const headline = match[1]!.trim();
  let detail = match[2]!.trim();
  if (detail.length > DETAIL_MAX) detail = `${detail.slice(0, DETAIL_MAX - 1)}…`;
  return { headline, detail };
}

export function isComplexityHeadline(s: string): boolean {
  return /^O\([^)]+\)$/.test(s.trim());
}

export function isCodeHeadline(s: string): boolean {
  const t = s.trim();
  if (isComplexityHeadline(t)) return false;
  if (!CODE_HEADLINE_PATTERN.test(t)) return false;
  return CODE_SYMBOL_PATTERN.test(t) || CODE_WORD_PATTERN.test(t);
}

export interface LabelQualityIssue {
  reason: string;
}

/** Returns issues with a quiz choice label, or null if acceptable. */
export function quizLabelIssues(label: string): LabelQualityIssue | null {
  const trimmed = label.trim();
  if (trimmed.length > 72) return { reason: 'label exceeds 72 chars' };
  if (COMMA_BEFORE_DASH.test(trimmed)) return { reason: 'comma-split before dash' };

  const { headline, detail } = parseQuizChoiceLabel(trimmed);
  if (!detail) return { reason: 'missing detail clause after em dash' };
  if (headline.includes('…')) return { reason: 'truncated headline' };
  if (GENERIC_DETAILS.has(detail.toLowerCase())) return { reason: `generic detail: ${detail}` };
  if (BAD_HEADLINE_END.test(headline)) return { reason: `comma-split headline: ${headline}` };
  if (MIDWORD_ELLIPSIS.test(trimmed)) return { reason: 'mid-word truncation' };

  return null;
}

export function collectQuizLabelIssues(
  entries: { id: string; questions: { id: string; choices: { label: string }[] }[] }[],
): string[] {
  const bad: string[] = [];
  for (const entry of entries) {
    for (const q of entry.questions) {
      for (const c of q.choices) {
        const issue = quizLabelIssues(c.label);
        if (issue) bad.push(`${entry.id} · ${q.id}: ${c.label} (${issue.reason})`);
      }
    }
  }
  return bad;
}
