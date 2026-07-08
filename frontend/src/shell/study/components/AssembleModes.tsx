import { useState, type ReactNode } from 'react';
import { Puzzle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { ASSEMBLE_GAMES } from '@/components/puzzle/assemble';
import { EmptyState, MiniTabs } from '@/shell/canvas';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import { useCodeStudioContent, useCodeStudioPhase } from '@/shell/study/hooks/useCodeStudio';
import {
  BlanksMode,
  BlocksMode,
  ClozeMode,
  FirstLetterMode,
  ParsonsMode,
  ScrambleMode,
} from './assemble/shared';
import { SnapCallMode } from './assemble/SnapCallMode';
import { ImposterMode } from './assemble/ImposterMode';
import { OneStrokeMode } from './assemble/OneStrokeMode';
import { RushMode } from './assemble/RushMode';

type Mode =
  | 'snap-call'
  | 'imposter'
  | 'one-stroke'
  | 'blocks'
  | 'blanks'
  | 'scramble'
  | 'parsons'
  | 'cloze'
  | 'rush'
  | 'firstletter';

const GAME_MODE_IDS = new Set(ASSEMBLE_GAMES.map((g) => g.id));

const MODES: { v: Mode; label: ReactNode }[] = [
  ...ASSEMBLE_GAMES.map((g) => ({ v: g.id as Mode, label: g.name })),
  { v: 'blocks', label: 'Blocks' },
  { v: 'blanks', label: 'Fill blanks' },
  { v: 'scramble', label: 'Scramble' },
  { v: 'parsons', label: 'Parsons' },
  { v: 'cloze', label: 'Cloze' },
  { v: 'rush', label: 'Rush' },
  { v: 'firstletter', label: 'First letter' },
];

function GameMode({ mode }: { mode: Mode }) {
  if (mode === 'snap-call') return <SnapCallMode />;
  if (mode === 'imposter') return <ImposterMode />;
  if (mode === 'one-stroke') return <OneStrokeMode />;
  return null;
}

export function AssembleModes() {
  const { reference } = useCodeStudioContent();
  const { pieces } = useCodeStudioPhase();
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<Mode>(() => (isMobile ? 'snap-call' : 'blocks'));

  if (!pieces || !reference) {
    return (
      <div className="assemble-mode-empty grid min-h-0 flex-1 place-items-center p-6">
        <EmptyState
          icon={<Puzzle className="h-4 w-4" />}
          title="Nothing to assemble"
          hint="This problem has no source to break into pieces."
        />
      </div>
    );
  }

  return (
    <div className="study-assemble-shell assemble-mode-shell flex min-h-0 flex-1 flex-col">
      <div className="assemble-mode-toolbar ws-scroll flex shrink-0 items-center gap-2 overflow-x-auto border-b border-edge px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <MiniTabs value={mode} options={MODES} onChange={setMode} />
      </div>
      {GAME_MODE_IDS.has(mode) ? (
        <div
          className={cn(
            'assemble-mode-workspace flex min-h-0 flex-1 flex-col p-2 sm:p-3',
            isMobile ? 'ws-scroll overflow-y-auto' : 'overflow-hidden',
          )}
        >
          <GameMode mode={mode} />
        </div>
      ) : (
        <div className="assemble-mode-workspace ws-scroll min-h-0 flex-1 overflow-auto p-3">
          {mode === 'blocks' && <BlocksMode />}
          {mode === 'blanks' && <BlanksMode />}
          {mode === 'scramble' && <ScrambleMode />}
          {mode === 'parsons' && <ParsonsMode />}
          {mode === 'cloze' && <ClozeMode />}
          {mode === 'rush' && <RushMode />}
          {mode === 'firstletter' && <FirstLetterMode />}
        </div>
      )}
    </div>
  );
}
