import { useCallback, useEffect, useRef } from 'react';
import { useGameRoom } from './useGameRoom';

/**
 * Typed relay channel for a single game. Subscribes to incoming peer messages
 * and returns a `send` function for outgoing ones. The handler is kept in a ref
 * so games can close over fresh state without re-subscribing every render.
 *
 *   const send = useGameChannel<Move>((move, from) => applyPeerMove(move));
 *   send({ kind: 'guess', value: 42 });
 */
export function useGameChannel<M = unknown>(
  onMessage: (msg: M, fromId: string) => void,
): (msg: M) => void {
  const { send, subscribe } = useGameRoom();
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(
    () => subscribe((data, fromId) => handlerRef.current(data as M, fromId)),
    [subscribe],
  );

  return useCallback((msg: M) => send(msg), [send]);
}
