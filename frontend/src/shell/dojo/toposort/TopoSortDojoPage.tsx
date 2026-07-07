import { ListMusic } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { DojoGameChrome } from '../ui/DojoGameChrome';
import { DojoBadge, DojoCallout, DojoKbd } from '../ui/shared';
import { LEVEL_IDS } from './engine/graph';
import { TopoGameProvider, useTopoGame } from './TopoGameProvider';
import { CompleteCard } from './ui/CompleteCard';
import { GraphBoard } from './ui/GraphBoard';
import { IntroCard } from './ui/IntroCard';
import { LevelStrip } from './ui/LevelStrip';
import { MelodyStrip } from './ui/MelodyStrip';
import { TouchPad } from './ui/TouchPad';

function TopoChrome() {
  const { completedCount } = useTopoGame();
  return (
    <DojoGameChrome
      icon={ListMusic}
      title="Melody Machine"
      completedCount={completedCount}
      levelCount={LEVEL_IDS.length}
    />
  );
}

function StatusRow() {
  const { level, levelIndex, actions } = useTopoGame();
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-1.5 px-3 pt-2.5">
      <DojoBadge tone="accent">
        Level {levelIndex + 1} · {level.title}
      </DojoBadge>
      <DojoBadge tone="muted">
        {actions} actions · par {level.par}
      </DojoBadge>
    </div>
  );
}

function MessageRow() {
  const { level, message, error, showHint, ready } = useTopoGame();
  let text = message;
  let tone = error ? 'text-bad' : 'text-good';
  if (!text && showHint) {
    tone = 'text-ink3';
    text = ready.length
      ? `Ready now: ${ready.map((i) => level.nodes[i]!.key).join(', ')} — glowing notes have no prerequisites left.`
      : 'Nothing has in-degree 0 right now.';
  }
  return (
    <p
      className={cn(
        'min-h-[1.375rem] shrink-0 px-4 pt-1.5 text-center text-xs min-[480px]:text-sm',
        tone,
      )}
      aria-live="polite"
    >
      {text}
    </p>
  );
}

function StuckCallout() {
  const { level, stuck, complete } = useTopoGame();
  if (!level.cyclic || !stuck || complete) return null;
  return (
    <div className="flex shrink-0 justify-center px-3 pb-1">
      <DojoCallout className="flex items-center gap-1.5 text-sm">
        Nothing is ready but notes remain… that&rsquo;s a cycle. Press{' '}
        <DojoKbd className="justify-center">c</DojoKbd>
      </DojoCallout>
    </div>
  );
}

export function TopoSortDojoPage() {
  return (
    <TopoGameProvider>
      <div className="relative flex h-full w-full flex-col overflow-hidden">
        <TopoChrome />
        <LevelStrip />
        <StatusRow />
        <MessageRow />
        <div className="flex min-h-0 flex-1 overflow-auto px-3 py-3">
          <GraphBoard />
        </div>
        <StuckCallout />
        <MelodyStrip />
        <TouchPad />
        <IntroCard />
        <CompleteCard />
      </div>
    </TopoGameProvider>
  );
}
