import { useEffect, useRef } from 'react';

/**
 * Host-authoritative shared-state publishing, done safely.
 *
 * The host mirrors its local game state into the room's shared state so
 * spectators and late joiners stay in sync. This must happen in an effect (never
 * during render) and must NOT re-run when `sharedState` itself changes — the
 * publish call updates sharedState, so depending on it would loop. This hook
 * encapsulates that: `publish` is held in a ref (always fresh, never a dep) and
 * only the caller-provided `deps` (the local state that should trigger a
 * publish) drive re-runs.
 *
 *   usePublishState(role === 'host', [board, gen], () => publishBoard(board, gen));
 */
export function usePublishState(
  enabled: boolean,
  deps: readonly unknown[],
  publish: () => void,
): void {
  const publishRef = useRef(publish);
  publishRef.current = publish;
  useEffect(() => {
    if (enabled) publishRef.current();
    // publishRef is intentionally stable; only `enabled` + caller `deps` re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);
}
