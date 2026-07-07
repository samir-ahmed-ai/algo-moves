import { Play, Target } from 'lucide-react';
import { DojoBadge, DojoBtn, DojoKbd } from '@/shell/dojo/ui/shared';
import { LEVEL_IDS } from '../engine/graph';
import { useTopoGame } from '../TopoGameProvider';

export function IntroCard() {
  const { level, levelIndex, showIntro, complete, dismissIntro } = useTopoGame();
  if (!showIntro || complete) return null;

  const keyRows: [string, string][] = [
    [`1–${level.nodes.length}`, 'lock a ready note (glowing, in-degree 0)'],
    ...(level.cyclic ? [['c', 'call the cycle when nothing is ready'] as [string, string]] : []),
    ['?', 'toggle hint'],
    ['r', 'restart level'],
  ];

  return (
    <div className="vim-overlay" onClick={dismissIntro}>
      <div
        className="vim-overlay-card"
        role="dialog"
        aria-label={`Level: ${level.title}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <DojoBadge tone="accent">
            Level {levelIndex + 1} of {LEVEL_IDS.length}
          </DojoBadge>
          <DojoBadge tone="muted">Par {level.par} actions</DojoBadge>
        </div>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">{level.title}</h2>
        <p className="mt-1.5 flex items-start gap-1.5 text-sm text-ink2">
          <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
          {level.objective}
        </p>
        <div className="vim-overlay-keys mt-3">
          <p className="mb-1.5 text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide text-ink3">
            Keys
          </p>
          <ul className="flex flex-col gap-1.5">
            {keyRows.map(([key, help]) => (
              <li key={key} className="flex items-center gap-2 text-sm text-ink2">
                <DojoKbd className="vim-kbd--new min-w-[2rem] justify-center">{key}</DojoKbd>
                <span>{help}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink2">{level.lesson}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <DojoBtn variant="accent" className="vim-overlay-cta" onClick={dismissIntro} autoFocus>
            <Play className="h-3.5 w-3.5" />
            Start level
          </DojoBtn>
          <span className="text-[length:var(--fs-2xs)] text-ink3">… or just start typing</span>
        </div>
      </div>
    </div>
  );
}
