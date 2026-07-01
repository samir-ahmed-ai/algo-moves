import { Award } from 'lucide-react';
import { catalog } from '../../../../content';
import { useProgress, statFor } from '../../../../lib/progress';
import { cn } from '../../../../lib/cn';
import { useCanvasActions } from '../../CanvasContext';
import { Meter, Pill, Section, nodeText, nodeTextWrap } from '../../nodeui';

/** #60 Badges: award a badge per course when all its problems are mastered. */
export function BadgesPanelBody() {
  const progress = useProgress();
  const { focusPanel } = useCanvasActions();
  const courses = catalog.courses.map((c) => {
    const items = c.topics.flatMap((t) => t.items).filter((it) => it.pluginId);
    const mastered = items.filter((it) => statFor(progress, it.id).mastered).length;
    return { id: c.id, title: c.title, total: items.length, mastered, done: items.length > 0 && mastered === items.length };
  });
  const earned = courses.filter((c) => c.done).length;
  return (
    <div className="nodrag flex flex-col" onPointerDown={() => focusPanel('badges')}>
      <Section title="Courses" bordered={false} right={<Pill tone={earned > 0 ? 'good' : 'muted'}>{earned}/{courses.length}</Pill>}>
        <div className="flex flex-col gap-2">
          {courses.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <Award className="h-4 w-4 shrink-0" style={{ color: c.done ? 'var(--ring)' : 'var(--text-3)', opacity: c.done ? 1 : 0.5 }} />
              <div className="min-w-0 flex-1">
                <div className={cn('text-ink', nodeTextWrap, nodeText.sm)}>{c.title}</div>
                <div className="mt-1">
                  <Meter value={c.mastered} max={c.total || 1} tone={c.done ? 'accent' : 'good'} height={5} />
                </div>
              </div>
              <Pill>
                {c.mastered}/{c.total}
              </Pill>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
