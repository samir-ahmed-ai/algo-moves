import { Lock, Trophy } from 'lucide-react';
import { catalog } from '../../../content';
import { useWorkspace } from '@/store/workspace';
import { useProgress, statFor } from '@/store/persistence';
import { cn } from '@/lib/utils/cn';

import { useCanvasStatic, Chip, Meter, nodeIconGlyph, nodeTextWrap } from '@/shell/canvas';
/** #62 Learning path: ordered sequence with mastery + jump-to. */
export function PathPanelBody() {
  const { item } = useCanvasStatic();
  const { openProblem } = useWorkspace();
  const progress = useProgress();
  const items = catalog.items.filter((it) => it.pluginId);
  const idx = items.findIndex((it) => it.id === item.id);
  const masteredCount = items.filter((it) => statFor(progress, it.id).mastered).length;
  return (
    <section className="reference-panel reference-panel--path nodrag learning-path-panel">
      <div className="learning-path-panel__hero">
        <div>
          <span className="learning-path-panel__eyebrow">learning path</span>
          <h3>
            Step {idx + 1} of {items.length}
          </h3>
        </div>
        <Chip tone="good" mono>
          {masteredCount} mastered
        </Chip>
      </div>
      <Meter value={masteredCount} max={items.length} tone="good" height={4} />
      <div className="learning-path-list">
        {items.map((it, i) => {
          const current = it.id === item.id;
          const mastered = statFor(progress, it.id).mastered;
          const unmet = it.prereqs.filter((p) => !statFor(progress, p).mastered);
          const locked = unmet.length > 0 && !mastered;
          return (
            <button
              key={it.id}
              type="button"
              className={cn(
                'learning-path-row',
                current && 'is-current',
                mastered && 'is-mastered',
                locked && 'is-locked',
              )}
              onClick={() => openProblem(it.id)}
            >
              <span className="learning-path-row__index">{i + 1}</span>
              <span
                className={cn('learning-path-row__title min-w-0 flex-1', nodeTextWrap)}
                title={
                  locked
                    ? `Suggested first: ${unmet.map((p) => catalog.getItem(p)?.title ?? p).join(', ')}`
                    : undefined
                }
              >
                {it.title}
              </span>
              {locked && <Lock className={cn(nodeIconGlyph, 'shrink-0 text-ink3')} />}
              {mastered && <Trophy className={cn(nodeIconGlyph, 'shrink-0 text-good')} />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
