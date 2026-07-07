import { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, Timer, Trophy } from 'lucide-react';
import { Btn, Meter, useCanvasStatic } from '@/shell/canvas';
import { useCodeStudioContent, useCodeStudioPhase } from '@/shell/study/hooks/useCodeStudio';
import {
  assembleGameSeconds,
  createAssembleGameStats,
  type AssembleGameStats,
} from '@/components/puzzle/assemble/types';
import { formatSecs } from '@/components/puzzle/assemble/gameShared';
import { GameHud, HudChip } from '@/components/puzzle/assemble/gameUi';
import { maybeWriteRushBest, readRushBestSeconds } from '@/store/practice/assembleBest';
import { Mono, OrderBoard, SolvedBanner } from './shared';

export function RushMode() {
  const { active, reference } = useCodeStudioContent();
  const { pieces } = useCodeStudioPhase();
  const resolved = pieces!;
  const byId = useMemo(() => new Map(resolved.map((p) => [p.id, p])), [resolved]);
  const correct = resolved.map((p) => p.id);
  const { item } = useCanvasStatic();

  const [runKey, setRunKey] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [best, setBest] = useState<number | null>(() => readRushBestSeconds(item.id, active));
  const start = useRef(Date.now());

  useEffect(() => {
    start.current = Date.now();
    setElapsed(0);
    setDone(false);
  }, [runKey]);

  useEffect(() => {
    if (done) return;
    const t = window.setInterval(() => setElapsed((Date.now() - start.current) / 1000), 100);
    return () => window.clearInterval(t);
  }, [done, runKey]);

  const finish = (): AssembleGameStats | undefined => {
    if (done) return undefined;
    const stats = createAssembleGameStats(start.current);
    const secs = assembleGameSeconds(stats);
    setDone(true);
    setElapsed(secs);
    if (maybeWriteRushBest(item.id, active, secs)) {
      setBest(secs);
    }
    return stats;
  };

  return (
    <div className="flex flex-col gap-2">
      <GameHud
        left={
          <HudChip tone={done ? 'good' : 'accent'}>
            <Timer className="h-3 w-3" />
            {formatSecs(elapsed * 1000)}
          </HudChip>
        }
        center={
          best !== null ? (
            <HudChip>
              <Trophy className="h-3 w-3" />
              best {formatSecs(best * 1000)}
            </HudChip>
          ) : undefined
        }
        right={
          <Btn
            size="xs"
            variant="ghost"
            icon={<RotateCcw className="h-3.5 w-3.5" />}
            onClick={() => setRunKey((k) => k + 1)}
          >
            Restart
          </Btn>
        }
      />
      <OrderBoard
        key={runKey}
        correctIds={correct}
        resetSig={`${reference.length}:rush:${runKey}`}
        onSolved={finish}
        renderRow={(id) => <Mono>{byId.get(id)!.code}</Mono>}
        footer={({ solved, correctCount, total }) =>
          solved ? (
            <SolvedBanner label={`Assembled in ${elapsed.toFixed(1)}s`} />
          ) : (
            <Meter value={correctCount} max={total} tone="accent" />
          )
        }
      />
    </div>
  );
}
