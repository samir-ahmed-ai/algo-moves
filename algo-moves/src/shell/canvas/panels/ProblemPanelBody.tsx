import { useWorkspace } from '../../../lib/workspace';
import { cn } from '../../../lib/cn';
import { useCanvasStatic } from '../CanvasContext';
import { Chip, difficultyTone, NodeTagChip, nodeText } from '../nodeui';

/** Problem node: title, summary, and tags. */
export function ProblemPanelBody() {
  const { item } = useCanvasStatic();
  const { mode } = useWorkspace();
  const inVisualize = mode === 'visualize';
  return (
    <div className="flex flex-col gap-[var(--node-gap,6px)]">
      {!inVisualize ? (
        <div className="flex flex-wrap items-center gap-[var(--node-gap,6px)]">
          <span className={cn(nodeText.title, 'font-semibold leading-tight text-ink')}>{item.title}</span>
          {item.difficulty && <Chip tone={difficultyTone(item.difficulty)}>{item.difficulty}</Chip>}
        </div>
      ) : (
        item.difficulty && (
          <div>
            <Chip tone={difficultyTone(item.difficulty)}>{item.difficulty}</Chip>
          </div>
        )
      )}
      {item.summary && <p className={cn(nodeText.sm, 'leading-relaxed text-ink2')}>{item.summary}</p>}
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-[var(--node-gap,6px)]">
          {item.tags.map((t) => (
            <NodeTagChip key={t} id={t} />
          ))}
        </div>
      )}
    </div>
  );
}
