import { useEffect, useMemo, useState } from 'react';
import { Puzzle } from 'lucide-react';
import { ASSEMBLE_GAMES, defaultGameFor } from '@/components/puzzle/assemble';
import { ReassemblePane } from '@/components/puzzle/ReassemblePane';
import { assembleGameStatsStore } from '@/shell/assembleGameStats';
import { MiniTabs, useCanvasStatic } from '@/shell/canvas';
import { useCodeStudioContent, useCodeStudioPhase } from '@/shell/study/CodeStudio';

type QuizAssembleMode = 'classic' | 'snap-call' | 'imposter' | 'one-stroke';

const MODES = [
  ...ASSEMBLE_GAMES.map((g) => ({ v: g.id as QuizAssembleMode, label: g.name })),
  { v: 'classic' as const, label: 'Classic' },
];

/** Reassemble games shown inline after the Learn Studio quiz — mirrors the mobile deck card. */
export function QuizAssembleGames({ onWinContinue }: { onWinContinue?: () => void }) {
  const { item } = useCanvasStatic();
  const { active, code } = useCodeStudioContent();
  const { pieces, reassembleKey } = useCodeStudioPhase();
  const lang = code?.lang;
  const scope = `${item.id}:${lang ?? active}`;
  const [mode, setMode] = useState<QuizAssembleMode>(() => defaultGameFor(scope).id as QuizAssembleMode);
  const stats = useMemo(() => assembleGameStatsStore(scope), [scope]);
  const game = ASSEMBLE_GAMES.find((g) => g.id === mode);

  useEffect(() => {
    setMode(defaultGameFor(scope).id as QuizAssembleMode);
  }, [scope]);

  if (!pieces) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-edge px-3 py-2">
        <span className="inline-flex items-center gap-1.5 text-[length:var(--fs-tight)] font-semibold uppercase tracking-wide text-ink3">
          <Puzzle className="h-3.5 w-3.5" />
          Rebuild it
        </span>
        <MiniTabs value={mode} options={MODES} onChange={setMode} />
      </div>
      {game ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2 sm:p-3">
          <game.Component
            key={`${item.id}:${active}:${mode}`}
            pieces={pieces}
            lang={lang}
            storageKey={scope}
            stats={stats}
            onComplete={onWinContinue}
            onContinue={onWinContinue}
          />
        </div>
      ) : (
        <div className="practice mobile-reassemble flex min-h-0 flex-1 flex-col overflow-hidden p-2 sm:p-3">
          <ReassemblePane
            key={reassembleKey}
            pieces={pieces}
            lang={lang}
            variant="mobile"
            onComplete={(_placed, _mistakes) => onWinContinue?.()}
          />
        </div>
      )}
    </div>
  );
}
