import { ScrollText } from 'lucide-react';
import { patternsForTags } from '../../../content';

import { useCanvasStatic, Chip, EmptyState } from '@/shell/canvas';
/** #66 Cheat sheet: terse one-liners for the problem's patterns. */
export function CheatPanelBody() {
  const { item } = useCanvasStatic();
  const cards = patternsForTags(item.tags);
  if (cards.length === 0) {
    return (
      <EmptyState
        icon={<ScrollText className="h-5 w-5" />}
        title="No cheat sheet"
        hint="This problem's tags have no pattern card yet."
      />
    );
  }
  return (
    <div className="cheat-panel">
      <div className="cheat-panel__head">
        <span>quick reference</span>
        <strong>{item.title}</strong>
      </div>
      {cards.map((c) => (
        <article key={c.id} className="cheat-card">
          <div className="cheat-card__header">
            <h3>{c.title}</h3>
            <Chip mono>{c.complexity.split('|')[0].trim()}</Chip>
          </div>
          <p className="cheat-card__idea">{c.idea}</p>
          <div className="cheat-card__signal">
            <span>Use when</span>
            <p>{c.whenToUse}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
