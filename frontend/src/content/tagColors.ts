import type { TagKind } from './tags';

/** Shared tag-kind accent colors for chips and badges. */
export const TAG_KIND_COLOR: Readonly<Record<TagKind, string>> = {
  pattern: 'var(--accent)',
  structure: 'var(--good)',
  skill: 'var(--team2-stroke)',
  meta: 'var(--text-3)',
};

export const TAG_KIND_LABEL: Readonly<Record<TagKind, string>> = {
  pattern: 'Pattern',
  structure: 'Structure',
  skill: 'Skill',
  meta: 'Meta',
};
