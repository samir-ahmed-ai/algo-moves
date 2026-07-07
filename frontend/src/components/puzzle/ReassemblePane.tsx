import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Keyboard, Lightbulb, RotateCcw, ScanEye } from 'lucide-react';
import type { CodePiece } from '@/lib/code';
import { cn } from '@/lib/utils/cn';
import { pieceHasEntrySignature } from '@/lib/editor';
import { CodeBlueprintOverlay } from './CodeBlueprintOverlay';
import { PuzzlePieceShell } from './PuzzlePieceShell';
import { DraggableTrayPiece } from './DraggableTrayPiece';
import { AssembledDropZone } from './AssembledDropZone';
import { useReassembleLogic } from './hooks/useReassembleLogic';
import { useTrayPointerDrag } from './hooks/useTrayPointerDrag';

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
  children: ReactNode;
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
  const rootRef = useRef<HTMLDivElement>(null);
  const assembledRef = useRef<HTMLDivElement>(null);
  const cheatRef = useRef<HTMLDivElement>(null);
  const [showCheatSheet, setShowCheatSheet] = useState(false);

  const {
    placed,
    tray,
    mistakes,
    wrongId,
    showHint,
    setShowHint,
    showOverview,
    setShowOverview,
    selectedIdx,
    setSelectedIdx,
    dragOver,
    setDragOver,
    completing,
    lastPlacedId,
    liveMessage,
    expected,
    done,
    progressPct,
    mobileWrap,
    mobileTrayColumns,
    reset,
    tryPlace,
    onDndDragStart,
    onDndDragOver,
    onDndDragEnd,
  } = useReassembleLogic({
    pieces,
    variant,
    initialMistakes,
    onComplete,
    resetOnWrong,
    rootRef,
    assembledRef,
    ...(initialPlacedIds ? { initialPlacedIds } : {}),
    ...(initialTrayIds ? { initialTrayIds } : {}),
    ...(onProgress ? { onProgress } : {}),
  });

  const { pointerGhost, onTrayPointerDown, onTrayPointerMove, finishTrayPointer, isDraggingPiece } =
    useTrayPointerDrag({
      variant,
      assembledRef,
      onPlace: tryPlace,
      setDragOver,
    });

  useEffect(() => {
    if (!showCheatSheet) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target;
      if (target instanceof Node && cheatRef.current && !cheatRef.current.contains(target)) {
        setShowCheatSheet(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [showCheatSheet]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const renderTrayPiece = (p: CodePiece, i: number) => {
    const optionLabel = `Block ${i + 1} of ${tray.length}: ${p.role}`;
    const shell = (
      <div
        role="option"
        aria-label={optionLabel}
        aria-selected={selectedIdx === i}
        tabIndex={0}
        title={optionLabel}
        onPointerDown={variant === 'mobile' ? (e) => onTrayPointerDown(e, p, i) : undefined}
        onPointerMove={variant === 'mobile' ? onTrayPointerMove : undefined}
        onPointerUp={variant === 'mobile' ? (e) => finishTrayPointer(e, p, i) : undefined}
        onPointerCancel={variant === 'mobile' ? (e) => finishTrayPointer(e, p, i) : undefined}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          setSelectedIdx(i);
          tryPlace(p);
        }}
        className={cn(
          'piece tray-piece nodrag',
          wrongId === p.id && 'shake-wrong',
          selectedIdx === i && 'tray-piece-selected',
          isDraggingPiece(p.id) && 'tray-piece-dragging',
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

    if (variant === 'mobile') return <div key={p.id}>{shell}</div>;
    return (
      <DraggableTrayPiece key={p.id} id={p.id}>
        {shell}
      </DraggableTrayPiece>
    );
  };

  const content = (
    <>
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
        <span className="mistakes-pill" title="Mistakes in this rebuild">
          {mistakes} err
        </span>
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

      <div
        className={cn(
          'reassemble-body flex min-h-0 flex-1 flex-col',
          mobileWrap && 'reassemble-body--scroll',
        )}
      >
        <AssembledDropZone
          innerRef={assembledRef}
          active={dragOver}
          className={cn(
            'assembled nodrag',
            placed.length > 0 && 'blk-board',
            placed.length === 0 && !done && 'assembled-has-empty',
            completing && 'assembled-complete-flash',
          )}
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
            <div
              key={p.id}
              className={cn('blk-row piece placed', lastPlacedId === p.id && 'placed-enter')}
            >
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
        </AssembledDropZone>

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
            <PuzzlePieceShell
              piece={pointerGhost.piece}
              lang={lang}
              wrap={!mobileWrap}
              mode="ghost"
            />
          </div>,
          document.body,
        )}

      {showOverview && (
        <CodeBlueprintOverlay
          pieces={pieces}
          lang={lang}
          wrap={false}
          onClose={() => setShowOverview(false)}
        />
      )}
    </>
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
      {variant === 'mobile' ? (
        content
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={onDndDragStart}
          onDragOver={onDndDragOver}
          onDragEnd={onDndDragEnd}
        >
          {content}
        </DndContext>
      )}
    </div>
  );
}
