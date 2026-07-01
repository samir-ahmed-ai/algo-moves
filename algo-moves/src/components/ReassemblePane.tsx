import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Lightbulb, RotateCcw } from 'lucide-react';
import type { CodePiece } from '../lib/codePieces';
import { cn } from '../lib/cn';

const FINISH_MS = 400;
const WRONG_MS = 350;

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function orderTray(all: CodePiece[], placedIds: string[], trayIds: string[]): CodePiece[] {
  const byId = new Map(all.map((p) => [p.id, p]));
  const placedSet = new Set(placedIds);
  const ordered = trayIds.map((id) => byId.get(id)).filter(Boolean) as CodePiece[];
  const missing = all.filter((p) => !placedSet.has(p.id) && !trayIds.includes(p.id));
  return [...ordered, ...missing];
}

export interface ReassemblePaneProps {
  pieces: CodePiece[];
  initialPlacedIds?: string[];
  initialTrayIds?: string[];
  initialMistakes?: number;
  onComplete: (placed: CodePiece[], mistakes: number) => void;
  onProgress?: (placedIds: string[], trayIds: string[], mistakes: number) => void;
  className?: string;
}

function BarIconButton({
  title,
  active,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={cn(
        'nodrag grid h-6 w-6 shrink-0 place-items-center rounded-md transition-colors',
        active ? 'bg-accentbg text-accent' : 'text-ink3 hover:bg-panel2 hover:text-ink',
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

export function ReassemblePane({
  pieces,
  initialPlacedIds,
  initialTrayIds,
  initialMistakes = 0,
  onComplete,
  onProgress,
  className,
}: ReassemblePaneProps) {
  const [placed, setPlaced] = useState<CodePiece[]>(() => {
    if (!initialPlacedIds?.length) return [];
    const byId = new Map(pieces.map((p) => [p.id, p]));
    return initialPlacedIds.map((id) => byId.get(id)).filter(Boolean) as CodePiece[];
  });
  const [tray, setTray] = useState<CodePiece[]>(() => {
    if (initialTrayIds?.length) return orderTray(pieces, initialPlacedIds ?? [], initialTrayIds);
    const placedSet = new Set(initialPlacedIds ?? []);
    return shuffle(pieces.filter((p) => !placedSet.has(p.id)));
  });
  const [mistakes, setMistakes] = useState(initialMistakes);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [completing, setCompleting] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const cheatRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);

  const expected = pieces[placed.length];
  const done = placed.length === pieces.length;
  const progressPct = pieces.length > 0 ? (placed.length / pieces.length) * 100 : 0;

  const emitProgress = useCallback(
    (nextPlaced: CodePiece[], nextTray: CodePiece[], nextMistakes: number) => {
      onProgress?.(
        nextPlaced.map((p) => p.id),
        nextTray.map((p) => p.id),
        nextMistakes,
      );
    },
    [onProgress],
  );

  const tryPlace = useCallback(
    (piece: CodePiece) => {
      if (!expected || done || completing) return false;
      if (piece.id === expected.id) {
        const nextPlaced = [...placed, piece];
        const nextTray = tray.filter((x) => x.id !== piece.id);
        setPlaced(nextPlaced);
        setTray(nextTray);
        setShowHint(false);
        setSelectedIdx(null);
        emitProgress(nextPlaced, nextTray, mistakes);
        return true;
      }
      setMistakes((m) => {
        const next = m + 1;
        emitProgress(placed, tray, next);
        return next;
      });
      setWrongId(piece.id);
      window.setTimeout(() => setWrongId(null), WRONG_MS);
      return false;
    },
    [expected, done, completing, placed, tray, mistakes, emitProgress],
  );

  const reset = useCallback(() => {
    completedRef.current = false;
    setCompleting(false);
    const shuffled = shuffle(pieces);
    setPlaced([]);
    setTray(shuffled);
    setMistakes(0);
    setWrongId(null);
    setShowHint(false);
    setSelectedIdx(null);
    emitProgress([], shuffled, 0);
  }, [pieces, emitProgress]);

  useEffect(() => {
    if (!done || completedRef.current) return;
    completedRef.current = true;
    setCompleting(true);
    const t = window.setTimeout(() => onComplete(placed, mistakes), FINISH_MS);
    return () => window.clearTimeout(t);
  }, [done, placed, mistakes, onComplete]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const onKey = (e: KeyboardEvent) => {
      if (done || completing) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setShowHint((h) => !h);
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        if (e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        reset();
        return;
      }
      if (e.key === 'Enter' && selectedIdx !== null && tray[selectedIdx]) {
        e.preventDefault();
        tryPlace(tray[selectedIdx]);
        return;
      }
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9 && num <= tray.length) {
        e.preventDefault();
        setSelectedIdx(num - 1);
      }
    };

    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [done, completing, selectedIdx, tray, tryPlace, reset]);

  useEffect(() => {
    if (!showCheatSheet) return;
    const onDoc = (e: MouseEvent) => {
      if (cheatRef.current && !cheatRef.current.contains(e.target as Node)) {
        setShowCheatSheet(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [showCheatSheet]);

  const onDragStart = (e: React.DragEvent, piece: CodePiece) => {
    e.dataTransfer.setData('text/plain', piece.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDropAssembled = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const id = e.dataTransfer.getData('text/plain');
    const piece = tray.find((p) => p.id === id);
    if (piece) tryPlace(piece);
  };

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      className={cn('code-studio-reassemble flex min-h-0 flex-1 flex-col outline-none', className)}
      aria-label="Reassemble code blocks in source order"
    >
      <div className="reassemble-bar" aria-live="polite">
        <div className="reassemble-progress-wrap">
          <div className="reassemble-progress-track">
            <div className="reassemble-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="progress-count">
            {placed.length}/{pieces.length}
          </span>
        </div>
        <span className="mistakes-pill">{mistakes} err</span>
        {!done && (
          <>
            <BarIconButton
              title={showHint ? 'Hide hint (H)' : 'Hint (H)'}
              active={showHint}
              onClick={() => setShowHint((h) => !h)}
            >
              <Lightbulb className="h-3.5 w-3.5" />
            </BarIconButton>
            <BarIconButton title="Shuffle (R)" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" />
            </BarIconButton>
            <div ref={cheatRef} className="relative">
              <BarIconButton
                title="Keyboard shortcuts"
                active={showCheatSheet}
                onClick={() => setShowCheatSheet((v) => !v)}
              >
                <Keyboard className="h-3.5 w-3.5" />
              </BarIconButton>
              {showCheatSheet && (
                <div className="cheat-sheet nodrag" role="dialog" aria-label="Keyboard shortcuts">
                  <div className="cheat-row">
                    <kbd>1–9</kbd> select block
                  </div>
                  <div className="cheat-row">
                    <kbd>Enter</kbd> place selected
                  </div>
                  <div className="cheat-row">
                    <kbd>H</kbd> toggle hint
                  </div>
                  <div className="cheat-row">
                    <kbd>R</kbd> shuffle tray
                  </div>
                  <div className="cheat-row">Click or drag to place</div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div
        className={cn('assembled nodrag', dragOver && 'assembled-drag-over', completing && 'assembled-complete-flash')}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDropAssembled}
        role="region"
        aria-label="Assembled code"
      >
        {placed.length === 0 && !done && (
          <div className="assembled-empty">Click or drag blocks below in source order →</div>
        )}
        {placed.map((p, i) => (
          <pre key={p.id} className="piece placed">
            <span className="piece-line-num" aria-hidden>
              {i + 1}
            </span>
            {p.code}
          </pre>
        ))}
        {!done && expected && (
          <div className="next-slot" aria-hidden>
            <span className="piece-line-num">{placed.length + 1}</span>
            <span className="next-slot-text">next block…</span>
          </div>
        )}
        {done && (
          <div className="assembled-done">
            Rebuilt the full solution with {mistakes} mistake{mistakes === 1 ? '' : 's'}.
          </div>
        )}
      </div>

      {!done && (
        <>
          {showHint && expected && <div className="hint-line">next: {expected.role}</div>}
          <div className="tray tray-grid" role="listbox" aria-label="Code block tray">
            {tray.map((p, i) => (
              <pre
                key={p.id}
                role="option"
                aria-selected={selectedIdx === i}
                tabIndex={0}
                draggable
                onDragStart={(e) => onDragStart(e, p)}
                className={cn(
                  'piece tray-piece nodrag',
                  wrongId === p.id && 'shake-wrong',
                  selectedIdx === i && 'tray-piece-selected',
                )}
                onClick={() => tryPlace(p)}
                onFocus={() => setSelectedIdx(i)}
              >
                <span className="tray-piece-key" aria-hidden>
                  {i < 9 ? i + 1 : '·'}
                </span>
                {p.code}
              </pre>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
