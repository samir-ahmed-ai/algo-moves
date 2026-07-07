import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useProgress, clearMistakes } from '@/store/persistence';

import { useCanvasStatic, Btn, EmptyState, nodeText } from '@/shell/canvas';
/** #55 Mistake log: wrong predictions collected for review. */
export function MistakesPanelBody() {
  const { item } = useCanvasStatic();
  const progress = useProgress();
  const mine = progress.mistakes.filter((m) => m.problemId === item.id);
  if (mine.length === 0) {
    return (
      <div className="practice-panel practice-panel--mistakes mistake-log-panel mistake-log-panel--empty">
        <EmptyState
          icon={<AlertTriangle className="h-5 w-5" />}
          title="No mistakes logged"
          hint="Wrong answers in Predict land here for review."
        />
      </div>
    );
  }
  return (
    <section className="practice-panel practice-panel--mistakes nodrag mistake-log-panel">
      <div className="mistake-log-panel__head">
        <div>
          <span className="mistake-log-panel__eyebrow">review queue</span>
          <h3>Wrong predictions</h3>
        </div>
        <div className="mistake-log-panel__actions">
          <span className="mistake-log-panel__count">{mine.length}</span>
          {progress.mistakes.length > 0 && (
            <Btn variant="danger" size="xs" onClick={clearMistakes}>
              Clear
            </Btn>
          )}
        </div>
      </div>
      <div className="mistake-log-list">
        {mine.map((m) => (
          <article key={m.id} className="mistake-card">
            <span className="mistake-card__label">Wrong prediction</span>
            <div className={cn('mistake-card__prompt leading-snug', nodeText.base)}>{m.prompt}</div>
            <div className="mistake-card__answers">
              <div className="mistake-answer mistake-answer--bad">
                <span>you</span>
                <strong>{m.picked}</strong>
              </div>
              <div className="mistake-answer mistake-answer--good">
                <span>right</span>
                <strong>{m.answer}</strong>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
