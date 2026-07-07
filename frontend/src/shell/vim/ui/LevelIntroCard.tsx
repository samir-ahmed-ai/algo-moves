import { Play, Target } from 'lucide-react';
import { MOTION_HELP } from '../engine';
import { VimBadge, VimBtn, VimKbd } from './vimUi';
import { useVimGame } from '../canvas/VimGameProvider';

export function LevelIntroCard() {
  const { level, showIntro, complete, dismissIntro, newKeys, mazeFocusRef } = useVimGame();
  if (!showIntro || complete) return null;

  const start = () => {
    dismissIntro();
    mazeFocusRef.current?.focus();
  };

  return (
    <div className="vim-overlay" onClick={start}>
      <div
        className="vim-overlay-card"
        role="dialog"
        aria-label={`Level: ${level.title}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <VimBadge tone="accent">
            Chapter {level.chapterNum} · {level.chapter}
          </VimBadge>
          {level.parMoves != null ? (
            <VimBadge tone="muted">Par {level.parMoves} moves</VimBadge>
          ) : null}
        </div>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">{level.title}</h2>
        <p className="mt-1.5 flex items-start gap-1.5 text-sm text-ink2">
          <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
          {level.objective}
        </p>
        {newKeys.length ? (
          <div className="vim-overlay-keys mt-3">
            <p className="mb-1.5 text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide text-ink3">
              New keys
            </p>
            <ul className="flex flex-col gap-1.5">
              {newKeys.map((kind) => (
                <li key={kind} className="flex items-center gap-2 text-sm text-ink2">
                  <VimKbd className="vim-kbd--new min-w-[2rem] justify-center">{kind}</VimKbd>
                  <span>{MOTION_HELP[kind]}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="mt-3 text-sm leading-relaxed text-ink2">{level.lesson}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <VimBtn variant="accent" className="vim-overlay-cta" onClick={start} autoFocus>
            <Play className="h-3.5 w-3.5" />
            Start level
          </VimBtn>
          <span className="text-[length:var(--fs-2xs)] text-ink3">… or just start typing</span>
        </div>
      </div>
    </div>
  );
}
