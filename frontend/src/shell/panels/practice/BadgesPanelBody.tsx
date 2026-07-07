import { Award } from 'lucide-react';
import { catalog } from '../../../content';
import { useProgress, statFor } from '@/store/persistence';
import { cn } from '@/lib/utils/cn';

import { useCanvasActions, Meter, nodeTextWrap } from '@/shell/canvas';
/** #60 Badges: award a badge per course when all its problems are mastered. */
export function BadgesPanelBody() {
  const progress = useProgress();
  const { focusPanel } = useCanvasActions();
  const courses = catalog.courses.map((c) => {
    const items = c.topics.flatMap((t) => t.items).filter((it) => it.pluginId);
    const mastered = items.filter((it) => statFor(progress, it.id).mastered).length;
    return {
      id: c.id,
      title: c.title,
      total: items.length,
      mastered,
      done: items.length > 0 && mastered === items.length,
    };
  });
  const earned = courses.filter((c) => c.done).length;
  return (
    <section
      className="practice-panel practice-panel--badges nodrag badges-panel"
      onPointerDown={() => focusPanel('badges')}
    >
      <div className="badges-panel__hero">
        <div>
          <span className="badges-panel__eyebrow">credential board</span>
          <h3>Course mastery</h3>
        </div>
        <div className={cn('badges-panel__score', earned > 0 && 'badges-panel__score--active')}>
          {earned}/{courses.length}
        </div>
      </div>
      <div className="badges-list">
        {courses.map((c) => (
          <article key={c.id} className={cn('badge-course-card', c.done && 'is-complete')}>
            <div className="badge-course-card__icon">
              <Award className="h-4 w-4" />
            </div>
            <div className="badge-course-card__body">
              <div className={cn('badge-course-card__title text-ink', nodeTextWrap)}>{c.title}</div>
              <Meter
                value={c.mastered}
                max={c.total || 1}
                tone={c.done ? 'accent' : 'good'}
                height={5}
              />
            </div>
            <div className="badge-course-card__count">
              {c.mastered}/{c.total}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
