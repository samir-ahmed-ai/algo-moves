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

export function usePlayer(total: number): Player {
  const [index, setIndex] = useState(0);
  const [isPlaying, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const [breakpoints, setBreakpoints] = useState<Set<number>>(() => new Set());
  const [bookmarks, setBookmarks] = useState<Map<number, string>>(() => new Map());
  const [reversed, setReversed] = useState(false);
  const timer = useRef<number | null>(null);
  const indexRef = useRef(index);
  indexRef.current = index;

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
  }, [total]);

  // Auto-stop at the boundary: frame 0 when reversed, the last frame otherwise (unless an A–B loop wraps).
  useEffect(() => {
    if (!isPlaying) return;
    if (reversed && index <= 0) setPlaying(false);
    else if (!reversed && loopEnd === null && index >= total - 1) setPlaying(false);
  }, [index, isPlaying, total, loopEnd, reversed]);

  useEffect(() => {
    if (!isPlaying) return;
    const ms = Math.max(80, Math.round(BASE_MS / speed));
    timer.current = window.setInterval(() => {
      const i = indexRef.current;
      let nextI: number;
      if (reversed) nextI = Math.max(i - 1, 0);
      else nextI = loopEnd !== null && i >= loopEnd ? loopStart ?? 0 : Math.min(i + 1, total - 1);
      if (nextI === i) return; // at a boundary — the auto-stop effect handles it
      setIndex(nextI);
      if (breakpoints.has(nextI)) setPlaying(false); // hit a breakpoint
    }, ms);
    return clear;
  }, [isPlaying, total, speed, loopStart, loopEnd, breakpoints, reversed, clear]);

  const next = useCallback(() => {
    setPlaying(false);
    setIndex((i) => Math.min(i + 1, total - 1));
  }, [total]);

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
      setIndex(Math.max(0, Math.min(i, total - 1)));
    },
    [total],
  );

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      if (!p) {
        setIndex((i) => {
          if (loopEnd !== null && (i >= loopEnd || i < (loopStart ?? 0))) return loopStart ?? 0;
          return i >= total - 1 ? 0 : i;
        });
      }
      return !p;
    });
  }, [total, loopStart, loopEnd]);

  const clearLoop = useCallback(() => {
    setLoopStart(null);
    setLoopEnd(null);
  }, []);

  const toggleBreakpoint = useCallback((i: number) => {
    setBreakpoints((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }, []);

  const setBookmark = useCallback((i: number, note: string) => {
    setBookmarks((prev) => new Map(prev).set(i, note));
  }, []);

  const removeBookmark = useCallback((i: number) => {
    setBookmarks((prev) => {
      const next = new Map(prev);
      next.delete(i);
      return next;
    });
  }, []);

  const toggleReverse = useCallback(() => setReversed((r) => !r), []);

  return {
    index,
    total,
    isPlaying,
    next,
    prev,
    reset,
    togglePlay,
    goTo,
    speed,
    setSpeed,
    loopStart,
    loopEnd,
    setLoopStart,
    setLoopEnd,
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
