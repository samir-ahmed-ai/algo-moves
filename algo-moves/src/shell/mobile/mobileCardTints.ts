import type { Item } from '../../content';

const DIFF_TINT: Record<string, string> = {
  Easy: 'var(--good)',
  Medium: 'var(--edge-active)',
  Hard: 'var(--bad)',
};

export function tintFor(item: Item): string {
  return DIFF_TINT[item.difficulty ?? ''] ?? 'var(--accent)';
}
