import { useCallback, useEffect, useRef } from 'react';
import { useGameRoom } from './useGameRoom';

export type GameChannelHandler<M> = (msg: M, fromId: string) => void;
export type GameChannelSend<M> = (msg: M) => void;

export type GameChannelOptions<M> = Readonly<{
  /** Drop invalid relay frames at the channel boundary (dev logs in non-production). */
  validate?: ((value: unknown) => value is M) | undefined;
}>;

/**
 * Typed relay channel for a single game. Subscribes to incoming peer messages
 * and returns a `send` function for outgoing ones. The handler is kept in a ref
 * so games can close over fresh state without re-subscribing every render.
 *
 *   const send = useGameChannel<Move>((move, from) => applyPeerMove(move));
 *   send({ kind: 'guess', value: 42 });
 */
export function useGameChannel<M = unknown>(
  onMessage: GameChannelHandler<M>,
  options?: GameChannelOptions<M> | undefined,
): GameChannelSend<M> {
  const { send, subscribe } = useGameRoom();
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;
  const validateRef = useRef(options?.validate);
  validateRef.current = options?.validate;

  useEffect(
    () =>
      subscribe((data, fromId) => {
        const validate = validateRef.current;
        if (validate && !validate(data)) {
          if (import.meta.env.DEV) {
            console.warn('[useGameChannel] dropped invalid frame', data);
          }
          return;
        }
        handlerRef.current(data as M, fromId);
      }),
    [subscribe],
  );

  return useCallback((msg: M) => send(msg), [send]);
}
