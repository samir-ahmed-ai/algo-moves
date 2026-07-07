import { Play, Target } from 'lucide-react';
import { DojoBadge, DojoBtn, DojoKbd } from '@/shell/dojo/ui/shared';
import { LEVEL_IDS } from '../engine/schedule';
import { useScheduleGame } from '../ScheduleGameProvider';

const KEY_LEGEND: [string, string][] = [
  ['1–9', 'book that meeting — the compatible one that ends earliest'],
  ['?', 'toggle hints — the best pick pulses'],
  ['r', 'restart the level'],
];

export function IntroCard() {
  const { level, showIntro, complete, dismissIntro } = useScheduleGame();
  if (!showIntro || complete) return null;

  const levelNum = LEVEL_IDS.indexOf(level.id) + 1;

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
            Level {levelNum} of {LEVEL_IDS.length}
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
            {KEY_LEGEND.map(([key, help]) => (
              <li key={key} className="flex items-center gap-2 text-sm text-ink2">
                <DojoKbd className="min-w-[2.5rem] justify-center">{key}</DojoKbd>
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
