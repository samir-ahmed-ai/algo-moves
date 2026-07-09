import { useEffect, useRef } from 'react';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useProgress, statFor, setMastered, useSrsData } from '@/store/persistence';
import { proficiency, masteryBand } from '@/lib/mastery/proficiency';
import { PRACTICE_ADVANCE_MS } from '../shared/practiceConstants';

const DAY_MS = 86_400_000;

import {
  useCanvasActions,
  useCanvasStatic,
  Btn,
  Label,
  Meter,
  Stat,
  StatGrid,
  StreakPips,
  nodeText,
} from '@/shell/canvas';
/** #51 Mastery meter + streaks (localStorage-backed, per problem). */
export function MasteryPanelBody() {
  const { item } = useCanvasStatic();
  const progress = useProgress();
  const srs = useSrsData();
  const { focusPanel, advancePractice } = useCanvasActions();
  const s = statFor(progress, item.id);
  const advancedRef = useRef(false);
  const wasMasteredRef = useRef(s.mastered);
  const acc = s.attempts ? Math.round((s.correct / s.attempts) * 100) : 0;

  const card = srs.cards[item.id];
  const lastReview = card?.fsrs?.last_review ? new Date(card.fsrs.last_review).getTime() : 0;
  const band = masteryBand(
    proficiency({
      stability: card?.fsrs?.stability ?? 0,
      elapsedDays: lastReview ? Math.max(0, (Date.now() - lastReview) / DAY_MS) : 0,
      reps: card?.reps ?? 0,
      attempts: s.attempts,
      correct: s.correct,
    }),
  );
  const dueForReview = card ? card.due <= Date.now() : false;

  useEffect(() => {
    const wasMastered = wasMasteredRef.current;
    wasMasteredRef.current = s.mastered;
    if (!s.mastered || wasMastered || advancedRef.current) return;
    advancedRef.current = true;
    const t = window.setTimeout(() => advancePractice('mastery'), PRACTICE_ADVANCE_MS);
    return () => window.clearTimeout(t);
  }, [s.mastered, advancePractice]);

  return (
    <div className="practice-panel practice-panel--mastery nodrag flex flex-col gap-2">
      <div className="mastery-status-row flex items-center gap-2">
        <Trophy
          className="h-5 w-5"
          style={{ color: s.mastered ? 'var(--good)' : 'var(--text-3)' }}
        />
        <span className={cn('font-medium text-ink', nodeText.sm)}>
          {s.mastered ? 'Mastered' : 'In progress'}
        </span>
        <span className="flex-1" />
        <span className={cn('font-mono tabular-nums text-good', nodeText.base)}>{acc}%</span>
      </div>
      {(card || s.attempts > 0) && (
        <div className="mastery-band-row flex items-center gap-1.5">
          <span className="rounded bg-panel2 px-1.5 py-0.5 text-xs font-semibold text-ink2">
            {band}
          </span>
          {dueForReview && (
            <span className="rounded bg-warnbg px-1.5 py-0.5 text-xs font-semibold text-warn">
              Due for review
            </span>
          )}
        </div>
      )}
      <Meter value={acc} max={100} tone="good" />
      <StatGrid cols={2}>
        <Stat k="attempts" v={s.attempts} />
        <Stat k="streak" v={s.streak} tone="accent" />
        <Stat k="best" v={s.bestStreak} />
      </StatGrid>
      <div className="mastery-target-row flex items-center justify-between">
        <Label>to master</Label>
        <StreakPips value={Math.min(s.streak, 3)} max={3} />
      </div>
      <Btn
        variant="ghost"
        size="xs"
        onClick={() => {
          focusPanel('mastery');
          setMastered(item.id, !s.mastered);
        }}
        className="self-start"
      >
        {s.mastered ? 'Mark unmastered' : 'Mark mastered'}
      </Btn>
    </div>
  );
}
