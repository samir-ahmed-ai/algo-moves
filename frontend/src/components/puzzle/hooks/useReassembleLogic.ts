import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CodePiece } from '@/lib/code';
import { shuffle } from '@/lib/utils/shuffle';
import { balanceTrayColumns } from '@/lib/code';
import { hapticError, hapticSuccess } from '@/lib/utils/haptic';
import { isEditableTarget } from '@/lib/utils/keyboard';

const FINISH_MS = 400;
const WRONG_MS = 350;
const PLACE_ENTER_MS = 220;
export const MOBILE_WRAP_COLS = 22;

function orderTray(all: CodePiece[], placedIds: string[], trayIds: string[]): CodePiece[] {
  const byId = new Map(all.map((p) => [p.id, p]));
  const placedSet = new Set(placedIds);
  const ordered = trayIds.map((id) => byId.get(id)).filter(Boolean) as CodePiece[];
  const missing = all.filter((p) => !placedSet.has(p.id) && !trayIds.includes(p.id));
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
  rootRef: React.RefObject<HTMLDivElement | null>;
  assembledRef: React.RefObject<HTMLDivElement | null>;
}) {
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
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [lastPlacedId, setLastPlacedId] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState('');
  const completedRef = useRef(false);
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
  }, [done, completing, selectedIdx, tray, tryPlace, reset, variant, showOverview, rootRef]);

  const onDragStart = useCallback((e: React.DragEvent, piece: CodePiece) => {
    e.dataTransfer.setData('text/plain', piece.id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const onDropAssembled = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const id = e.dataTransfer.getData('text/plain');
      const piece = tray.find((p) => p.id === id);
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
    onDragStart,
    onDropAssembled,
  };
}
