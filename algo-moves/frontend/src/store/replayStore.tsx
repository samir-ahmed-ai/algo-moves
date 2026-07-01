import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Frame } from '../core/types';

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

export function ReplayStoreProvider({ children }: { children: ReactNode }) {
  const [trace, setTrace] = useState('');
  const [speed, setSpeed] = useState(1);
  const [transformedFrames, setTransformedFrames] = useState<Frame[]>([]);
  const [chainPaused, setChainPaused] = useState(false);

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
    [trace, speed, transformedFrames, chainPaused],
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
