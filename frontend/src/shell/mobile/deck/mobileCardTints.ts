import type { Item } from '../../../content';
import { difficultyTint } from '../../../content/difficultyTint';

export function tintFor(item: Item): string {
  return difficultyTint(item.difficulty, 'var(--accent)');
}
