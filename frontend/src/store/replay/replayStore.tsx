import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Frame } from '@/core/types';

/** Replay engine state — separated from canvas graph (Strudel dual-store pattern). */
export interface ReplayState {
  trace: string;
  speed: number;
  transformedFrames: Frame[];
  chainPaused: boolean;
}

interface ReplayStore extends ReplayState {
  setTrace: (t: string) => void;
  setSpeed: (s: number) => void;
  setTransformedFrames: (f: Frame[]) => void;
  setChainPaused: (p: boolean) => void;
}

const Ctx = createContext<ReplayStore | null>(null);

const DEFAULT_SPEED = 1;
const MIN_SPEED = 0.25;
const MAX_SPEED = 4;

function normalizeReplaySpeed(speed: number): number {
  if (!Number.isFinite(speed)) return DEFAULT_SPEED;
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed));
}

function normalizeFrames(frames: Frame[]): Frame[] {
  return Array.isArray(frames) ? frames.slice() : [];
}

export function ReplayStoreProvider({ children }: { children: ReactNode }) {
  const [trace, setTraceState] = useState('');
  const [speed, setSpeedState] = useState(DEFAULT_SPEED);
  const [transformedFrames, setTransformedFramesState] = useState<Frame[]>([]);
  const [chainPaused, setChainPausedState] = useState(false);

  const setTrace = useCallback((next: string) => {
    setTraceState(next);
  }, []);

  const setSpeed = useCallback((next: number) => {
    setSpeedState(normalizeReplaySpeed(next));
  }, []);

  const setTransformedFrames = useCallback((next: Frame[]) => {
    setTransformedFramesState(normalizeFrames(next));
  }, []);

  const setChainPaused = useCallback((next: boolean) => {
    setChainPausedState(next === true);
  }, []);

  const value = useMemo(
    () => ({
      trace,
      speed,
      transformedFrames,
      chainPaused,
      setTrace,
      setSpeed,
      setTransformedFrames,
      setChainPaused,
    }),
    [
      trace,
      speed,
      transformedFrames,
      chainPaused,
      setTrace,
      setSpeed,
      setTransformedFrames,
      setChainPaused,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useReplayStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useReplayStore must be used inside ReplayStoreProvider');
  return ctx;
}

export function useReplayStoreOptional() {
  return useContext(Ctx);
}
