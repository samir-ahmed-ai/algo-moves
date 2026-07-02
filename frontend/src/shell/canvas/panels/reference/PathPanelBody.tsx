import { Lock, Trophy } from 'lucide-react';
import { catalog } from '../../../../content';
import { useWorkspace } from '@/store/workspace';
import { useProgress, statFor } from '@/store/persistence';
import { cn } from '@/lib/utils/cn';
import { useCanvasStatic } from '../../CanvasContext';
import { Chip, Hint, Meter, nodeIconGlyph, nodeTextWrap, Pill, Row } from '../../nodeui';

/** #62 Learning path: ordered sequence with mastery + jump-to. */
export function PathPanelBody() {
  const { item } = useCanvasStatic();
  const { openProblem } = useWorkspace();
  const progress = useProgress();
  const items = catalog.items.filter((it) => it.pluginId);
  const idx = items.findIndex((it) => it.id === item.id);
  const masteredCount = items.filter((it) => statFor(progress, it.id).mastered).length;
  return (
    <div className="nodrag flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Hint>
          Step {idx + 1} of {items.length}
        </Hint>
        <Chip tone="good" mono>
          {masteredCount} mastered
        </Chip>
      </div>
      <Meter value={masteredCount} max={items.length} tone="good" height={4} />
      <div className="flex flex-col">
        {items.map((it, i) => {
          const current = it.id === item.id;
          const mastered = statFor(progress, it.id).mastered;
          const unmet = it.prereqs.filter((p) => !statFor(progress, p).mastered);
          const locked = unmet.length > 0 && !mastered;
          return (
            <Row
              key={it.id}
              active={current}
              onClick={() => openProblem(it.id)}
            >
              <Pill>{i + 1}</Pill>
              <span
                className={cn('min-w-0 flex-1', nodeTextWrap, locked && 'opacity-60')}
                title={locked ? `Suggested first: ${unmet.map((p) => catalog.getItem(p)?.title ?? p).join(', ')}` : undefined}
              >
                {it.title}
              </span>
              {locked && <Lock className={cn(nodeIconGlyph, 'shrink-0 text-ink3')} />}
              {mastered && <Trophy className={cn(nodeIconGlyph, 'shrink-0 text-good')} />}
            </Row>
          );
        })}
      </div>
    </div>
  );
}
