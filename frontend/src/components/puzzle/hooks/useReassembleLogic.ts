import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type { CodePiece } from '@/lib/code';
import { shuffle } from '@/lib/utils/shuffle';
import { balanceTrayColumns } from '@/lib/code';
import { hapticError, hapticSuccess } from '@/lib/utils/haptic';
import { isEditableTarget } from '@/lib/utils/keyboard';

const FINISH_MS = 400;
const WRONG_MS = 350;
const PLACE_ENTER_MS = 220;
export const MOBILE_WRAP_COLS = 22;

function isCodePiece(value: CodePiece | undefined): value is CodePiece {
  return Boolean(value);
}

function normalizeMistakes(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function piecesFromIds(all: CodePiece[], ids: string[] | undefined): CodePiece[] {
  if (!ids?.length) return [];
  const byId = new Map(all.map((p) => [p.id, p]));
  const seen = new Set<string>();
  const restored: CodePiece[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const piece = byId.get(id);
    if (!piece) continue;
    seen.add(id);
    restored.push(piece);
  }
  return restored;
}

function orderTray(all: CodePiece[], placedIds: string[], trayIds: string[]): CodePiece[] {
  const byId = new Map(all.map((p) => [p.id, p]));
  const placedSet = new Set(placedIds);
  const traySet = new Set<string>();
  const ordered = trayIds
    .map((id) => {
      if (traySet.has(id) || placedSet.has(id)) return undefined;
      traySet.add(id);
      return byId.get(id);
    })
    .filter(isCodePiece);
  const missing = all.filter((p) => !placedSet.has(p.id) && !traySet.has(p.id));
  return [...ordered, ...missing];
}

export function useReassembleLogic({
  pieces,
  variant = 'default',
  initialPlacedIds,
  initialTrayIds,
  initialMistakes = 0,
  onComplete,
  onProgress,
  resetOnWrong = false,
  rootRef,
  assembledRef,
}: {
  pieces: CodePiece[];
  variant?: 'default' | 'mobile';
  initialPlacedIds?: string[];
  initialTrayIds?: string[];
  initialMistakes?: number;
  onComplete: (placed: CodePiece[], mistakes: number) => void;
  onProgress?: (placedIds: string[], trayIds: string[], mistakes: number) => void;
  resetOnWrong?: boolean;
  rootRef: RefObject<HTMLDivElement | null>;
  assembledRef: RefObject<HTMLDivElement | null>;
}) {
  const [placed, setPlaced] = useState<CodePiece[]>(() => piecesFromIds(pieces, initialPlacedIds));
  const [tray, setTray] = useState<CodePiece[]>(() => {
    if (initialTrayIds?.length) return orderTray(pieces, initialPlacedIds ?? [], initialTrayIds);
    const placedSet = new Set(initialPlacedIds ?? []);
    return shuffle(pieces.filter((p) => !placedSet.has(p.id)));
  });
  const [mistakes, setMistakes] = useState(() => normalizeMistakes(initialMistakes));
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [lastPlacedId, setLastPlacedId] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState('');
  const completedRef = useRef(false);
  const lastPlacedTimerRef = useRef<number | null>(null);
  const wrongTimerRef = useRef<number | null>(null);
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
    if (lastPlacedTimerRef.current !== null) window.clearTimeout(lastPlacedTimerRef.current);
    if (wrongTimerRef.current !== null) window.clearTimeout(wrongTimerRef.current);
    lastPlacedTimerRef.current = null;
    wrongTimerRef.current = null;
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
        if (lastPlacedTimerRef.current !== null) window.clearTimeout(lastPlacedTimerRef.current);
        lastPlacedTimerRef.current = window.setTimeout(() => {
          setLastPlacedId(null);
          lastPlacedTimerRef.current = null;
        }, PLACE_ENTER_MS);
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
      if (wrongTimerRef.current !== null) window.clearTimeout(wrongTimerRef.current);
      wrongTimerRef.current = window.setTimeout(() => {
        setWrongId(null);
        if (resetOnWrong) reset();
        wrongTimerRef.current = null;
      }, WRONG_MS);
      return false;
    },
    [
      expected,
      done,
      completing,
      placed,
      tray,
      mistakes,
      pieces.length,
      emitProgress,
      resetOnWrong,
      reset,
    ],
  );

  useEffect(() => {
    if (!done || completedRef.current) return;
    setShowOverview(false);
    completedRef.current = true;
    setCompleting(true);
    const t = window.setTimeout(() => onComplete(placed, mistakes), FINISH_MS);
    return () => window.clearTimeout(t);
  }, [done, placed, mistakes, onComplete]);

  useEffect(
    () => () => {
      if (lastPlacedTimerRef.current !== null) window.clearTimeout(lastPlacedTimerRef.current);
      if (wrongTimerRef.current !== null) window.clearTimeout(wrongTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    const el = assembledRef.current;
    if (!el || placed.length === 0) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [placed.length, assembledRef]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

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
      const selectedPiece = selectedIdx !== null ? tray[selectedIdx] : undefined;
      if (e.key === 'Enter' && selectedPiece) {
        e.preventDefault();
        tryPlace(selectedPiece, selectedIdx ?? undefined);
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
  }, [done, completing, selectedIdx, tray, tryPlace, reset, variant, showOverview, rootRef]);

  const onDndDragStart = useCallback((event: DragStartEvent) => {
    setDragOver(false);
    void event;
  }, []);

  const onDndDragOver = useCallback(() => {
    setDragOver(true);
  }, []);

  const onDndDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDragOver(false);
      if (event.over?.id !== 'assembled-drop') return;
      const piece = tray.find((p) => p.id === String(event.active.id));
      if (piece) tryPlace(piece);
    },
    [tray, tryPlace],
  );

  return {
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
    trayIds: tray.map((p) => p.id),
  };
}
