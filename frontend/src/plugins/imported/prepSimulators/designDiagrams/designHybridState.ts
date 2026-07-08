import { useSyncExternalStore } from 'react';

export type DesignHybridMode = 'architecture' | 'walkthrough';

let mode: DesignHybridMode = 'architecture';
const listeners = new Set<() => void>();

function getSnapshot(): DesignHybridMode {
  return mode;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Shared tab state for design hybrid plugins (Architecture vs Walkthrough). */
export const designHybridState = {
  get: getSnapshot,
  set(next: DesignHybridMode): void {
    if (mode === next) return;
    mode = next;
    listeners.forEach((l) => l());
  },
  reset(): void {
    designHybridState.set('architecture');
  },
  subscribe,
  use(): DesignHybridMode {
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  },
  /** True when transport / scrubber should be hidden (static diagram visible). */
  hidesTransport(): boolean {
    return mode === 'architecture';
  },
};

/** Hide transport when the Architecture tab is active on a hybrid design plugin. */
export function useDesignHybridHidesTransport(designHybrid?: boolean): boolean {
  const tab = designHybridState.use();
  return !!designHybrid && tab === 'architecture';
}
