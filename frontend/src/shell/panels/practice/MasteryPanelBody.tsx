import { useEffect, useRef } from 'react';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useProgress, statFor, setMastered } from '@/store/persistence';
import { PRACTICE_ADVANCE_MS } from '../shared/practiceConstants';

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
  const { focusPanel, advancePractice } = useCanvasActions();
  const s = statFor(progress, item.id);
  const advancedRef = useRef(false);
  const wasMasteredRef = useRef(s.mastered);
  const acc = s.attempts ? Math.round((s.correct / s.attempts) * 100) : 0;

  useEffect(() => {
    const wasMastered = wasMasteredRef.current;
    wasMasteredRef.current = s.mastered;
    if (!s.mastered || wasMastered || advancedRef.current) return;
    advancedRef.current = true;
    const t = window.setTimeout(() => advancePractice('mastery'), PRACTICE_ADVANCE_MS);
    return () => window.clearTimeout(t);
  }, [s.mastered, advancePractice]);

  return (
    <div className="nodrag flex flex-col gap-2">
      <div className="flex items-center gap-2">
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
      <Meter value={acc} max={100} tone="good" />
      <StatGrid cols={2}>
        <Stat k="attempts" v={s.attempts} />
        <Stat k="streak" v={s.streak} tone="accent" />
        <Stat k="best" v={s.bestStreak} />
      </StatGrid>
      <div className="flex items-center justify-between">
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
