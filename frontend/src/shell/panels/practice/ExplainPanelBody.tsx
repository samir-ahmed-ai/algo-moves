import { useEffect, useState } from 'react';
import { recordAttempt } from '@/store/persistence';
import { useCanvasActions, useCanvasFrame, useCanvasStatic } from '../../canvas/CanvasContext';
import { Banner, Btn, Field, Hint, TextArea } from '../../canvas/ui/nodeui';
import { PRACTICE_ADVANCE_MS } from '../shared/practiceConstants';

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
    <div className="nodrag flex flex-col gap-2">
      <Field label="Explain the invariant" hint={`What key idea makes ${item.title} work?`}>
        <TextArea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => focusPanel('explain')}
          rows={4}
          placeholder="e.g. each step preserves … so when it ends …"
        />
      </Field>
      {!revealed ? (
        <Btn
          variant="primary"
          size="sm"
          disabled={!text.trim()}
          onClick={() => {
            focusPanel('explain');
            setRevealed(true);
          }}
          className="self-start"
        >
          Reveal reference
        </Btn>
      ) : (
        <div className="flex flex-col gap-2">
          <Banner tone="accent" label="Reference">
            <div className="flex flex-col gap-1">
              {item.summary && <p className="text-ink">{item.summary}</p>}
              {intro && <p>{intro}</p>}
              {outro && outro !== intro && <p>{outro}</p>}
            </div>
          </Banner>
          {graded === null ? (
            <div className="flex items-center gap-2">
              <Hint>How did you do?</Hint>
              <Btn variant="good" size="sm" onClick={() => grade(true)}>
                I had it
              </Btn>
              <Btn variant="ghost" size="sm" onClick={() => grade(false)}>
                Missed it
              </Btn>
            </div>
          ) : (
            <Hint>{graded ? '✓ Logged — nicely done.' : 'Logged — revisit the replay and try again.'}</Hint>
          )}
        </div>
      )}
    </div>
  );
}
