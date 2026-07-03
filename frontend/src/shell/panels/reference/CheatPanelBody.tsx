import { ScrollText } from 'lucide-react';
import { patternsForTags } from '../../../content';
import { useCanvasStatic } from '../../canvas/CanvasContext';
import { Chip, DefRow, EmptyState } from '../../canvas/nodeui';

/** #66 Cheat sheet: terse one-liners for the problem's patterns. */
export function CheatPanelBody() {
  const { item } = useCanvasStatic();
  const cards = patternsForTags(item.tags);
  if (cards.length === 0) {
    return (
      <EmptyState icon={<ScrollText className="h-5 w-5" />} title="No cheat sheet" hint="This problem's tags have no pattern card yet." />
    );
  }
  return (
    <div className="flex flex-col">
      {cards.map((c) => (
        <DefRow key={c.id} term={c.title} meta={<Chip mono>{c.complexity.split('|')[0].trim()}</Chip>}>
          {c.idea}
        </DefRow>
      ))}
    </div>
  );
}
