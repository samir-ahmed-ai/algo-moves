import { useCallback, useEffect, useRef, useState } from 'react';

export interface Player {
  index: number;
  total: number;
  isPlaying: boolean;
  next: () => void;
  prev: () => void;
  reset: () => void;
  togglePlay: () => void;
  goTo: (i: number) => void;
  /** Playback speed multiplier (1 = base). */
  speed: number;
  setSpeed: (s: number) => void;
  /** A–B repeat segment (inclusive). null when unset. */
  loopStart: number | null;
  loopEnd: number | null;
  setLoopStart: (i: number | null) => void;
  setLoopEnd: (i: number | null) => void;
  clearLoop: () => void;
  /** Frame indices that auto-pause playback when reached. */
  breakpoints: Set<number>;
  toggleBreakpoint: (i: number) => void;
  /** Frame index → annotation note (bookmarks). */
  bookmarks: Map<number, string>;
  setBookmark: (i: number, note: string) => void;
  removeBookmark: (i: number) => void;
  /** Play backwards toward frame 0 (#109). */
  reversed: boolean;
  toggleReverse: () => void;
}

const BASE_MS = 1100;
const MIN_MS = 80;
const MIN_SPEED = 0.25;
const MAX_SPEED = 4;

function safeTotal(total: number): number {
  return Number.isFinite(total) ? Math.max(0, Math.round(total)) : 0;
}

function clampFrameIndex(i: number, total: number): number {
  const max = Math.max(0, total - 1);
  return Number.isFinite(i) ? Math.max(0, Math.min(Math.round(i), max)) : 0;
}

export function usePlayer(total: number): Player {
  const frameTotal = safeTotal(total);
  const [index, setIndex] = useState(0);
  const [isPlaying, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const [breakpoints, setBreakpoints] = useState<Set<number>>(() => new Set());
  const [bookmarks, setBookmarks] = useState<Map<number, string>>(() => new Map());
  const [reversed, setReversed] = useState(false);
  const timer = useRef<number | null>(null);

  // The interval tick and togglePlay read through this instead of closing over
  // state directly, so toggling a breakpoint/loop/direction mid-playback doesn't
  // reset the timer, and togglePlay keeps a stable identity like next/prev/goTo
  // — only total/speed (below) should restart the interval.
  const latest = useRef({ index, isPlaying, loopStart, loopEnd, breakpoints, reversed });
  latest.current = { index, isPlaying, loopStart, loopEnd, breakpoints, reversed };

  const clear = useCallback(() => {
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  // New problem: rewind and drop frame-specific loop + breakpoints (speed is a user preference, kept).
  useEffect(() => {
    setIndex(0);
    setPlaying(false);
    setLoopStart(null);
    setLoopEnd(null);
    setBreakpoints(new Set());
    setBookmarks(new Map());
    setReversed(false);
  }, [frameTotal]);

  // Auto-stop at the boundary: frame 0 when reversed, the last frame otherwise (unless an A–B loop wraps).
  useEffect(() => {
    if (!isPlaying) return;
    if (reversed && index <= 0) setPlaying(false);
    else if (!reversed && loopEnd === null && index >= frameTotal - 1) setPlaying(false);
  }, [index, isPlaying, frameTotal, loopEnd, reversed]);

  useEffect(() => {
    if (!isPlaying) return;
    const safeSpeed = Number.isFinite(speed) ? Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed)) : 1;
    const ms = Math.max(MIN_MS, Math.round(BASE_MS / safeSpeed));
    timer.current = window.setInterval(() => {
      const {
        index: i,
        loopStart: ls,
        loopEnd: le,
        breakpoints: bps,
        reversed: rev,
      } = latest.current;
      const nextI = rev
        ? clampFrameIndex(i - 1, frameTotal)
        : le !== null && i >= le
          ? clampFrameIndex(ls ?? 0, frameTotal)
          : clampFrameIndex(i + 1, frameTotal);
      if (nextI === i) return; // at a boundary — the auto-stop effect handles it
      setIndex(nextI);
      if (bps.has(nextI)) setPlaying(false); // hit a breakpoint
    }, ms);
    return clear;
  }, [isPlaying, frameTotal, speed, clear]);

  const next = useCallback(() => {
    setPlaying(false);
    setIndex((i) => clampFrameIndex(i + 1, frameTotal));
  }, [frameTotal]);

  const prev = useCallback(() => {
    setPlaying(false);
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  const reset = useCallback(() => {
    setPlaying(false);
    setIndex(0);
  }, []);

  const goTo = useCallback(
    (i: number) => {
      setPlaying(false);
      setIndex(clampFrameIndex(i, frameTotal));
    },
    [frameTotal],
  );

  const togglePlay = useCallback(() => {
    // Resuming (not pausing): rewind into the loop segment, or from the end.
    if (!latest.current.isPlaying) {
      setIndex((i) => {
        const { loopStart: ls, loopEnd: le } = latest.current;
        if (le !== null && (i >= le || i < (ls ?? 0))) return ls ?? 0;
        return i >= frameTotal - 1 ? 0 : i;
      });
    }
    setPlaying((p) => !p);
  }, [frameTotal]);

  const clearLoop = useCallback(() => {
    setLoopStart(null);
    setLoopEnd(null);
  }, []);

  const setClampedLoopStart = useCallback(
    (i: number | null) => setLoopStart(i == null ? null : clampFrameIndex(i, frameTotal)),
    [frameTotal],
  );

  const setClampedLoopEnd = useCallback(
    (i: number | null) => setLoopEnd(i == null ? null : clampFrameIndex(i, frameTotal)),
    [frameTotal],
  );

  const toggleBreakpoint = useCallback(
    (i: number) => {
      setBreakpoints((prev) => {
        const frame = clampFrameIndex(i, frameTotal);
        const next = new Set(prev);
        if (next.has(frame)) next.delete(frame);
        else next.add(frame);
        return next;
      });
    },
    [frameTotal],
  );

  const setBookmark = useCallback(
    (i: number, note: string) => {
      setBookmarks((prev) => new Map(prev).set(clampFrameIndex(i, frameTotal), note.trim()));
    },
    [frameTotal],
  );

  const removeBookmark = useCallback(
    (i: number) => {
      setBookmarks((prev) => {
        const frame = clampFrameIndex(i, frameTotal);
        const next = new Map(prev);
        next.delete(frame);
        return next;
      });
    },
    [frameTotal],
  );

  const toggleReverse = useCallback(() => setReversed((r) => !r), []);

  const clampSpeed = useCallback(
    (s: number) => (Number.isFinite(s) ? Math.max(MIN_SPEED, Math.min(MAX_SPEED, s)) : 1),
    [],
  );

  return {
    index,
    total: frameTotal,
    isPlaying,
    next,
    prev,
    reset,
    togglePlay,
    goTo,
    speed,
    setSpeed: (s: number) => setSpeed(clampSpeed(s)),
    loopStart,
    loopEnd,
    setLoopStart: setClampedLoopStart,
    setLoopEnd: setClampedLoopEnd,
    clearLoop,
    breakpoints,
    toggleBreakpoint,
    bookmarks,
    setBookmark,
    removeBookmark,
    reversed,
    toggleReverse,
  };
}
