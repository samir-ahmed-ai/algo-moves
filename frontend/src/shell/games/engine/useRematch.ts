import { useCallback } from 'react';

type RematchMsg = { kind: 'rematch' } & Record<string, unknown>;

/**
 * Reset local match state and broadcast a rematch frame to peers.
 * Pass `extra` for generation counters (e.g. tic-tac-toe `gen`).
 */
export function useRematch<M extends RematchMsg>(
  reset: () => void,
  send: (msg: M) => void,
  extra?: Omit<M, 'kind'>,
): () => void {
  return useCallback(() => {
    reset();
    send({ kind: 'rematch', ...extra } as M);
  }, [reset, send, extra]);
}
