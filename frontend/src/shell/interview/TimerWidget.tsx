import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Timer } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '@/shell/chromeUi';
import { RADIUS_CTRL, RADIUS_SHELL } from '@/shell/canvas/ui/nodeui';
import { useCanvasCollab } from '@/shell/collab/CanvasCollabProvider';

const PRESET_MINUTES = [5, 10, 15, 30, 45, 60];

function formatMs(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Shared session countdown. Everyone sees the remaining time (computed locally
 * from the host-broadcast `endsAt`); only the host gets the controls popover.
 */
export function TimerWidget() {
  const { session, isHost, startTimer, pauseTimer, resumeTimer, resetTimer } = useCanvasCollab();
  const timer = session.interviewRuntime?.timer;
  const canControl = isHost && session.kind === 'interview';
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!timer?.running) return undefined;
    const iv = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(iv);
  }, [timer?.running]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!timer) return null;
  const hasTimer = timer.durationMs > 0;
  if (!hasTimer && !canControl) return null;

  const remaining =
    timer.running && timer.endsAt !== null ? Math.max(0, timer.endsAt - now) : timer.remainingMs;
  const danger = hasTimer && remaining < 10_000;
  const warn = hasTimer && !danger && remaining < 60_000;

  const pill = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border px-2.5 py-1 font-medium tabular-nums',
        'interview-timer-pill',
        RADIUS_CTRL,
        chromeText.sm,
        danger
          ? 'animate-pulse border-bad/50 bg-badbg text-bad'
          : warn
            ? 'border-amber-500/50 bg-amber-500/10 text-amber-500'
            : 'border-edge bg-panel text-ink',
        canControl && 'cursor-pointer hover:border-accent',
      )}
    >
      <Timer className="h-3.5 w-3.5" />
      {hasTimer ? formatMs(remaining) : 'Timer'}
    </span>
  );

  if (!canControl) return pill;

  const startCustom = () => {
    const mins = Number(custom);
    if (mins > 0) {
      startTimer(mins * 60_000);
      setCustom('');
    }
  };

  const inlineBtn =
    'interview-timer__inline grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink3 transition-colors hover:bg-panel2 hover:text-ink disabled:opacity-40';
  const canResume = timer.remainingMs > 0 || timer.durationMs > 0;

  return (
    <div ref={rootRef} className="interview-timer relative flex items-center gap-0.5">
      <button
        type="button"
        aria-label="Session timer"
        title="Timer — pick a duration"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {pill}
      </button>
      {hasTimer ? (
        <>
          {timer.running ? (
            <button
              type="button"
              title="Pause timer"
              aria-label="Pause timer"
              onClick={pauseTimer}
              className={inlineBtn}
            >
              <Pause className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              title="Resume timer"
              aria-label="Resume timer"
              onClick={resumeTimer}
              disabled={!canResume}
              className={inlineBtn}
            >
              <Play className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            title="Reset timer"
            aria-label="Reset timer"
            onClick={resetTimer}
            className={inlineBtn}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </>
      ) : null}
      {open ? (
        <div
          className={cn(
            'absolute right-0 top-full z-20 mt-1 flex w-60 flex-col gap-2 border border-edge bg-panel p-3 shadow-lg',
            'interview-timer__panel',
            RADIUS_SHELL,
          )}
        >
          <p className={cn('interview-timer__label font-medium text-ink3', chromeText.xs)}>
            Set duration
          </p>
          <div className="interview-timer__presets grid grid-cols-3 gap-1.5">
            {PRESET_MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => startTimer(m * 60_000)}
                className={cn(
                  'border border-edge bg-panel2 py-1 font-medium text-ink2 transition-colors hover:border-accent hover:text-accent',
                  'interview-timer__preset',
                  RADIUS_CTRL,
                  chromeText.sm,
                )}
              >
                {m}m
              </button>
            ))}
          </div>
          <div className="interview-timer__custom flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              max={240}
              placeholder="Custom min"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') startCustom();
              }}
              className={cn(
                'min-w-0 flex-1 border border-edge bg-panel2 px-2 py-1 text-ink outline-none placeholder:text-ink3 focus:border-accent',
                'interview-timer__input',
                RADIUS_CTRL,
                chromeText.sm,
              )}
            />
            <button
              type="button"
              onClick={startCustom}
              disabled={!(Number(custom) > 0)}
              className={cn(
                'bg-accent px-2.5 py-1 font-medium text-white disabled:opacity-40',
                'interview-timer__start',
                RADIUS_CTRL,
                chromeText.sm,
              )}
            >
              Start
            </button>
          </div>
          {hasTimer ? (
            <div className="interview-timer__actions flex gap-1.5">
              {timer.running ? (
                <button
                  type="button"
                  onClick={pauseTimer}
                  className={cn(
                    'inline-flex flex-1 items-center justify-center gap-1 border border-edge bg-panel2 py-1 font-medium text-ink2 hover:text-ink',
                    RADIUS_CTRL,
                    chromeText.sm,
                  )}
                >
                  <Pause className="h-3.5 w-3.5" /> Pause
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resumeTimer}
                  disabled={timer.remainingMs <= 0 && timer.durationMs <= 0}
                  className={cn(
                    'inline-flex flex-1 items-center justify-center gap-1 border border-edge bg-panel2 py-1 font-medium text-ink2 hover:text-ink disabled:opacity-40',
                    RADIUS_CTRL,
                    chromeText.sm,
                  )}
                >
                  <Play className="h-3.5 w-3.5" /> Resume
                </button>
              )}
              <button
                type="button"
                onClick={resetTimer}
                className={cn(
                  'inline-flex flex-1 items-center justify-center gap-1 border border-edge bg-panel2 py-1 font-medium text-ink2 hover:text-ink',
                  RADIUS_CTRL,
                  chromeText.sm,
                )}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
