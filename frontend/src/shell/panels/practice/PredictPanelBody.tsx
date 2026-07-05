import { useEffect, useMemo, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useProgress, statFor, recordAttempt, logMistake } from '@/store/persistence';
import {
  PREDICT_CORRECT_MS,
  PREDICT_MASTERY_FOCUS_MS,
  TIME_LIMIT,
} from '../shared/practiceConstants';
import { useCanvasActions, useCanvasFrame, useCanvasStatic, Banner, Btn, Chip, EmptyState, Hint, Label, Option, nodeText } from '@/shell/canvas';
import { buildShuffledChoices } from '@/lib/quiz';

/** #33 Predict-the-next-move: a generic challenge built from the recorder frames. */
export function PredictPanelBody() {
  const { frames } = useCanvasFrame();
  const { item } = useCanvasStatic();
  const { focusPanel, advancePractice } = useCanvasActions();
  const progress = useProgress();
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ ok: 0, total: 0 });
  const [timed, setTimed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);

  const types = useMemo(() => [...new Set(frames.map((f) => f.move.type))], [frames]);

  const pos = useMemo(() => {
    if (frames.length < 2) return 0;
    const s = (Math.abs(round * 2654435761 + 7) % (frames.length - 1)) | 0;
    return s;
  }, [round, frames.length]);

  const cur = frames[pos];
  const answer = frames[pos + 1]?.move.type;
  const choices = useMemo(() => {
    if (!answer) return [];
    return buildShuffledChoices(answer, types, round);
  }, [types, answer, round]);

  useEffect(() => setTimeLeft(TIME_LIMIT), [round]);
  useEffect(() => {
    if (!timed || picked !== null || !answer || !cur) return;
    if (timeLeft <= 0) {
      focusPanel('predict');
      setPicked('(timed out)');
      setScore((s) => ({ ...s, total: s.total + 1 }));
      recordAttempt(item.id, false);
      logMistake({
        problemId: item.id,
        problemTitle: item.title,
        prompt: `After "${cur.move.note}", next move? (timed out)`,
        picked: 'timed out',
        answer: answer.toLowerCase(),
      });
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timed, picked, timeLeft, round, answer, cur, item, focusPanel]);

  useEffect(() => {
    if (picked === null || picked !== answer) return;
    const s = statFor(progress, item.id);
    const delay = s.streak >= 3 ? PREDICT_MASTERY_FOCUS_MS : PREDICT_CORRECT_MS;
    const t = window.setTimeout(() => {
      if (statFor(progress, item.id).streak >= 3) advancePractice('predict');
      else {
        setPicked(null);
        setRound((r) => r + 1);
      }
    }, delay);
    return () => window.clearTimeout(t);
  }, [picked, answer, progress, item.id, advancePractice]);

  if (frames.length < 2 || !answer) {
    return (
      <EmptyState icon={<Lightbulb className="h-5 w-5" />} title="Too short to predict" hint="Pick a longer problem." />
    );
  }

  const answered = picked !== null;
  const next = () => {
    setPicked(null);
    setRound((r) => r + 1);
  };
  const pick = (t: string) => {
    if (answered) return;
    focusPanel('predict');
    setPicked(t);
    const correct = t === answer;
    setScore((s) => ({ ok: s.ok + (correct ? 1 : 0), total: s.total + 1 }));
    recordAttempt(item.id, correct);
    if (!correct) {
      logMistake({
        problemId: item.id,
        problemTitle: item.title,
        prompt: `After "${cur.move.note}", next move?`,
        picked: t.toLowerCase(),
        answer: (answer ?? '').toLowerCase(),
      });
    }
  };

  return (
    <div className="nodrag flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label>score</Label>
          <span className={cn('font-mono tabular-nums text-ink', nodeText.base)}>
            {score.ok}/{score.total}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {timed && !answered && (
            <Chip tone={timeLeft <= 5 ? 'bad' : 'muted'} mono>
              ⏱ {timeLeft}s
            </Chip>
          )}
          <Btn variant={timed ? 'ghost' : 'quiet'} size="xs" onClick={() => setTimed((v) => !v)}>
            timed
          </Btn>
        </div>
      </div>
      <Banner tone="default" label="Just happened">
        <div className={cn('font-mono text-ink', nodeText.base)}>{cur.move.note}</div>
        <p className={cn('mt-1 leading-snug text-ink2', nodeText.base)}>{cur.move.caption}</p>
      </Banner>
      <Label>What is the next move?</Label>
      <div className="flex flex-col gap-1.5">
        {choices.map((t) => {
          const state = !answered ? 'idle' : t === answer ? 'correct' : t === picked ? 'wrong' : 'dim';
          return (
            <Option key={t} state={state} disabled={answered} onClick={() => pick(t)}>
              {t.toLowerCase()}
            </Option>
          );
        })}
      </div>
      {answered && picked !== answer && (
        <div className="flex flex-col gap-2">
          <Hint>
            {picked === '(timed out)' ? '⏱ Timed out — ' : '✕ Actually — '}
            {frames[pos + 1].move.caption}
          </Hint>
          <Btn variant="primary" size="sm" onClick={next} className="self-start">
            next ›
          </Btn>
        </div>
      )}
      {answered && picked === answer && <Hint>✓ Right — {frames[pos + 1].move.caption}</Hint>}
    </div>
  );
}
