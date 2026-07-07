import { useEffect, useState } from 'react';
import { recordAttempt } from '@/store/persistence';
import { PRACTICE_ADVANCE_MS } from '../shared/practiceConstants';

import {
  useCanvasActions,
  useCanvasFrame,
  useCanvasStatic,
  Btn,
  Field,
  Hint,
  TextArea,
} from '@/shell/canvas';
/** #52 Explain it back: write the invariant, reveal the reference, self-grade. */
export function ExplainPanelBody() {
  const { item } = useCanvasStatic();
  const { frames } = useCanvasFrame();
  const { focusPanel, advancePractice } = useCanvasActions();
  const [text, setText] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [graded, setGraded] = useState<null | boolean>(null);
  const intro = frames[0]?.move.caption;
  const outro = frames[frames.length - 1]?.move.caption;
  const grade = (got: boolean) => {
    focusPanel('explain');
    setGraded(got);
    recordAttempt(item.id, got);
  };

  useEffect(() => {
    if (graded === null) return;
    const t = window.setTimeout(() => advancePractice('explain'), PRACTICE_ADVANCE_MS);
    return () => window.clearTimeout(t);
  }, [graded, advancePractice]);

  return (
    <section className="practice-panel practice-panel--explain nodrag worked-cases-panel">
      <div className="worked-cases-brief">
        <span className="worked-cases-brief__eyebrow">worked case</span>
        <h3>Explain the invariant</h3>
        <p>Capture the reason {item.title} stays correct before you reveal the reference.</p>
      </div>
      <div className="worked-cases-editor">
        <Field label="Your explanation" hint={`What key idea makes ${item.title} work?`}>
          <TextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => focusPanel('explain')}
            rows={5}
            placeholder="e.g. each step preserves … so when it ends …"
          />
        </Field>
      </div>
      {!revealed ? (
        <div className="worked-cases-actions">
          <Btn
            variant="primary"
            size="sm"
            disabled={!text.trim()}
            onClick={() => {
              focusPanel('explain');
              setRevealed(true);
            }}
          >
            Reveal reference
          </Btn>
        </div>
      ) : (
        <div className="worked-cases-review">
          <div className="worked-cases-reference-card">
            <div className="worked-cases-reference-card__label">Reference</div>
            <div className="worked-cases-reference-card__body">
              {item.summary && <p className="text-ink">{item.summary}</p>}
              {intro && <p>{intro}</p>}
              {outro && outro !== intro && <p>{outro}</p>}
            </div>
          </div>
          {graded === null ? (
            <div className="worked-cases-grade-row">
              <Hint>How did you do?</Hint>
              <Btn variant="good" size="sm" onClick={() => grade(true)}>
                I had it
              </Btn>
              <Btn variant="ghost" size="sm" onClick={() => grade(false)}>
                Missed it
              </Btn>
            </div>
          ) : (
            <Hint>
              {graded ? '✓ Logged — nicely done.' : 'Logged — revisit the replay and try again.'}
            </Hint>
          )}
        </div>
      )}
    </section>
  );
}
