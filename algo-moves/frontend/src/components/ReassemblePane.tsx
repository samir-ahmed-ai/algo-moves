import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Keyboard, Lightbulb, RotateCcw, ScanEye } from 'lucide-react';
import type { CodePiece } from '../lib/codePieces';
import { cn } from '../lib/cn';
import { hapticError, hapticSuccess } from '../lib/haptic';
import { pieceHasEntrySignature } from '../lib/highlightSnippet';
import { balanceTrayColumns } from '../lib/trayLayout';
import { CodeBlueprintOverlay } from './CodeBlueprintOverlay';
import { PuzzlePieceShell } from './PuzzlePieceShell';

const FINISH_MS = 400;
const WRONG_MS = 350;
const DRAG_THRESHOLD = 8;
const PLACE_ENTER_MS = 220;
const MOBILE_WRAP_COLS = 22;

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

function isOverAssembled(clientX: number, clientY: number, assembledEl: HTMLElement | null): boolean {
  if (!assembledEl) return false;
  const r = assembledEl.getBoundingClientRect();
  return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
}

export interface ReassemblePaneProps {
  pieces: CodePiece[];
  lang?: string;
  variant?: 'default' | 'mobile';
  initialPlacedIds?: string[];
  initialTrayIds?: string[];
  initialMistakes?: number;
  onComplete: (placed: CodePiece[], mistakes: number) => void;
  onProgress?: (placedIds: string[], trayIds: string[], mistakes: number) => void;
  /** Wrong piece clears the assembled area and reshuffles the tray (mobile rebuild step). */
  resetOnWrong?: boolean;
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
        'nodrag reassemble-bar-btn grid h-6 w-6 shrink-0 place-items-center rounded-md transition-colors',
        active ? 'bg-accentbg text-accent' : 'text-ink3 hover:bg-panel2 hover:text-ink',
      )}
      onPointerDown={(e) => e.stopPropagation()}
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
  lang = 'go',
  variant = 'default',
  initialPlacedIds,
  initialTrayIds,
  initialMistakes = 0,
  onComplete,
  onProgress,
  resetOnWrong = false,
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
  const [showOverview, setShowOverview] = useState(false);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [lastPlacedId, setLastPlacedId] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState('');
  const [pointerGhost, setPointerGhost] = useState<{ piece: CodePiece; x: number; y: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const assembledRef = useRef<HTMLDivElement>(null);
  const cheatRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);
  const pointerDragRef = useRef<{
    piece: CodePiece;
    startX: number;
    startY: number;
    active: boolean;
    axis: 'x' | 'y' | null;
    pointerId: number;
    target: HTMLElement;
    captured: boolean;
    width: number;
  } | null>(null);
  const dragMovedRef = useRef(false);
  const mobileWrap = variant === 'mobile';
  const mobileTrayColumns = useMemo(
    () => (mobileWrap ? balanceTrayColumns(tray, 2, MOBILE_WRAP_COLS) : null),
    [mobileWrap, tray],
  );

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

  const reset = useCallback(() => {
    completedRef.current = false;
    setCompleting(false);
    const shuffled = shuffle(pieces);
    setPlaced([]);
    setTray(shuffled);
    setMistakes(0);
    setWrongId(null);
    setShowHint(false);
    setShowOverview(false);
    setSelectedIdx(null);
    setLastPlacedId(null);
    setLiveMessage('');
    emitProgress([], shuffled, 0);
  }, [pieces, emitProgress]);

  const tryPlace = useCallback(
    (piece: CodePiece, trayIndex?: number) => {
      if (!expected || done || completing) return false;
      if (trayIndex !== undefined) setSelectedIdx(trayIndex);
      if (piece.id === expected.id) {
        const nextPlaced = [...placed, piece];
        const nextTray = tray.filter((x) => x.id !== piece.id);
        setPlaced(nextPlaced);
        setTray(nextTray);
        setShowHint(false);
        setSelectedIdx(null);
        setLastPlacedId(piece.id);
        window.setTimeout(() => setLastPlacedId(null), PLACE_ENTER_MS);
        hapticSuccess();
        setLiveMessage(`Correct — block ${nextPlaced.length} of ${pieces.length}`);
        emitProgress(nextPlaced, nextTray, mistakes);
        return true;
      }
      setMistakes((m) => {
        const next = m + 1;
        emitProgress(placed, tray, next);
        return next;
      });
      setWrongId(piece.id);
      hapticError();
      setLiveMessage(resetOnWrong ? 'Wrong order — blocks cleared' : 'Wrong order — try again');
      window.setTimeout(() => {
        setWrongId(null);
        if (resetOnWrong) reset();
      }, WRONG_MS);
      return false;
    },
    [expected, done, completing, placed, tray, mistakes, pieces.length, emitProgress, resetOnWrong, reset],
  );

  const clearPointerDrag = useCallback(() => {
    pointerDragRef.current = null;
    setPointerGhost(null);
    setDragOver(false);
  }, []);

  useEffect(() => {
    if (!done || completedRef.current) return;
    setShowOverview(false);
    completedRef.current = true;
    setCompleting(true);
    const t = window.setTimeout(() => onComplete(placed, mistakes), FINISH_MS);
    return () => window.clearTimeout(t);
  }, [done, placed, mistakes, onComplete]);

  useEffect(() => {
    const el = assembledRef.current;
    if (!el || placed.length === 0) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [placed.length]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (showOverview && (e.key === 'Escape' || e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setShowOverview(false);
        return;
      }

      if ((e.key === 'b' || e.key === 'B') && !showOverview) {
        e.preventDefault();
        setShowOverview(true);
        return;
      }

      if (done || completing) return;

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
      if (variant !== 'mobile' && num >= 1 && num <= 9 && num <= tray.length) {
        e.preventDefault();
        setSelectedIdx(num - 1);
      }
    };

    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [done, completing, selectedIdx, tray, tryPlace, reset, variant, showOverview]);

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

  const onTrayPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = pointerDragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.hypot(dx, dy) >= 4) dragMovedRef.current = true;

    if (!drag.active) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      // Vertical intent — release so the pane scroll container handles the pan.
      if (Math.abs(dy) >= Math.abs(dx)) {
        pointerDragRef.current = null;
        return;
      }
      drag.axis = 'x';
      drag.active = true;
      dragMovedRef.current = true;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        drag.captured = true;
      } catch {
        /* capture is best-effort */
      }
    }

    e.preventDefault();
    e.stopPropagation();
    setPointerGhost({ piece: drag.piece, x: e.clientX, y: e.clientY, width: drag.width });
    setDragOver(isOverAssembled(e.clientX, e.clientY, assembledRef.current));
  }, []);

  const finishTrayPointer = useCallback(
    (e: React.PointerEvent, piece: CodePiece, index: number) => {
      const drag = pointerDragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;

      if (drag.active) {
        if (isOverAssembled(e.clientX, e.clientY, assembledRef.current)) {
          tryPlace(piece, index);
        }
      } else if (!dragMovedRef.current) {
        tryPlace(piece, index);
      }

      try {
        if (drag.captured) (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* capture may already be released */
      }
      clearPointerDrag();
    },
    [tryPlace, clearPointerDrag],
  );

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

  const onTrayPointerDown = (e: React.PointerEvent, piece: CodePiece, index: number) => {
    if (variant !== 'mobile' || e.button !== 0) return;
    setSelectedIdx(index);
    const target = e.currentTarget as HTMLElement;
    pointerDragRef.current = {
      piece,
      startX: e.clientX,
      startY: e.clientY,
      active: false,
      axis: null,
      pointerId: e.pointerId,
      target,
      captured: false,
      width: target.getBoundingClientRect().width,
    };
    dragMovedRef.current = false;
  };

  const renderTrayPiece = (p: CodePiece, i: number) => (
    <div
      key={p.id}
      role="option"
      aria-selected={selectedIdx === i}
      tabIndex={0}
      draggable={variant !== 'mobile'}
      onDragStart={variant !== 'mobile' ? (e) => onDragStart(e, p) : undefined}
      onPointerDown={variant === 'mobile' ? (e) => onTrayPointerDown(e, p, i) : undefined}
      onPointerMove={variant === 'mobile' ? onTrayPointerMove : undefined}
      onPointerUp={variant === 'mobile' ? (e) => finishTrayPointer(e, p, i) : undefined}
      onPointerCancel={variant === 'mobile' ? (e) => finishTrayPointer(e, p, i) : undefined}
      className={cn(
        'piece tray-piece nodrag',
        wrongId === p.id && 'shake-wrong',
        selectedIdx === i && 'tray-piece-selected',
        pointerGhost?.piece.id === p.id && 'tray-piece-dragging',
        pieceHasEntrySignature(p.code, lang) && 'tray-piece-signature-entry',
        !mobileWrap && tray.length % 2 === 1 && i === tray.length - 1 && 'tray-piece-span',
      )}
      onClick={variant === 'mobile' ? undefined : () => tryPlace(p)}
      onFocus={() => setSelectedIdx(i)}
    >
      {variant !== 'mobile' && (
        <span className="tray-piece-key" aria-hidden>
          {i < 9 ? i + 1 : '·'}
        </span>
      )}
      <PuzzlePieceShell piece={p} lang={lang} wrap={!mobileWrap} mode="tray" />
    </div>
  );

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      className={cn(
        'code-studio-reassemble flex min-h-0 flex-1 flex-col outline-none',
        mobileWrap && 'code-studio-reassemble--mobile',
        className,
      )}
      aria-label="Reassemble code blocks in source order"
    >
      <div className="reassemble-sr-only" aria-live="assertive" aria-atomic="true">
        {liveMessage}
      </div>
      <div className="reassemble-bar" aria-live="polite" data-noswipe>
        <div className="reassemble-progress-wrap">
          <div className="reassemble-progress-track">
            <div
              className={cn('reassemble-progress-fill', done && 'reassemble-progress-done')}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="progress-count">
            {placed.length}/{pieces.length}
          </span>
        </div>
        <span className="mistakes-pill">{mistakes} err</span>
        <BarIconButton
          title={showOverview ? 'Hide blueprint (B)' : 'Show blueprint (B)'}
          active={showOverview}
          onClick={() => setShowOverview((v) => !v)}
        >
          <ScanEye className="h-3.5 w-3.5" />
        </BarIconButton>
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
            {variant !== 'mobile' && (
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
                      <kbd>B</kbd> blueprint overlay
                    </div>
                    <div className="cheat-row">
                      <kbd>Esc</kbd> close blueprint
                    </div>
                    <div className="cheat-row">
                      <kbd>R</kbd> shuffle tray
                    </div>
                    <div className="cheat-row">Click or drag to place</div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className={cn('reassemble-body flex min-h-0 flex-1 flex-col', mobileWrap && 'reassemble-body--scroll')}>
        <div
          ref={assembledRef}
          className={cn(
            'assembled nodrag',
            placed.length > 0 && 'blk-board',
            placed.length === 0 && !done && 'assembled-has-empty',
            dragOver && 'assembled-drag-over',
            completing && 'assembled-complete-flash',
          )}
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
            <div className="assembled-empty">
              <span className="assembled-empty-chevron" aria-hidden>
                ↑
              </span>
              <span>Drop blocks here in source order</span>
            </div>
          )}
          {placed.map((p) => (
            <div key={p.id} className={cn('blk-row piece placed', lastPlacedId === p.id && 'placed-enter')}>
              <PuzzlePieceShell piece={p} lang={lang} wrap={!mobileWrap} mode="placed" />
            </div>
          ))}
          {!done && expected && (
            <div className="next-slot" aria-hidden>
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
          <div className="reassemble-tray-wrap">
            {showHint && expected && <div className="hint-line">next: {expected.role}</div>}
            <div
              className={cn('tray tray-grid', mobileWrap && 'tray-grid-balanced')}
              role="listbox"
              aria-label="Code block tray"
            >
              {mobileTrayColumns
                ? mobileTrayColumns.map((col, ci) => (
                    <div key={ci} className="tray-column">
                      {col.map(({ piece, index }) => renderTrayPiece(piece, index))}
                    </div>
                  ))
                : tray.map((p, i) => renderTrayPiece(p, i))}
            </div>
          </div>
        )}
      </div>

      {pointerGhost &&
        createPortal(
          <div
            className="piece piece-drag-ghost"
            style={{
              left: pointerGhost.x,
              top: pointerGhost.y,
              width: pointerGhost.width,
              transform: 'translate(-50%, -50%) scale(1.03)',
            }}
            aria-hidden
          >
            <PuzzlePieceShell piece={pointerGhost.piece} lang={lang} wrap={!mobileWrap} mode="ghost" />
          </div>,
          document.body,
        )}

      {showOverview && (
        <CodeBlueprintOverlay pieces={pieces} lang={lang} wrap={false} onClose={() => setShowOverview(false)} />
      )}
    </div>
  );
}
