import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getArcadeStrings, useGamesLocale } from '../../locale';
import { useGameRoom } from '../../net/useGameRoom';
import { useGameChannel } from '../../net/useGameChannel';
import { useMatchReporter } from '../../net/useMatchReporter';
import { usePublishState } from '../../net/usePublishState';
import {
  mergeNestedRoomState,
  readNestedRoomState,
  useSharedStateRef,
} from '../../net/nestedRoomState';
import { useReportOnce, useRematch } from '../../engine';
import {
  clampNumber,
  decideWinner,
  evaluateGuess,
  proximityBand,
  proximityFraction,
  type GuessResult,
  type HeatLevel,
} from './logic';
import { getNumberDuelStrings } from './strings';
import { playCue } from '@/lib/utils/audio';

export type Attempt = { value: number; result: GuessResult; heat: HeatLevel; frac: number };

export type NdMsg =
  | { kind: 'ready' }
  | { kind: 'guess'; value: number }
  | { kind: 'feedback'; value: number; result: GuessResult; heat: HeatLevel; frac: number; count: number }
  | { kind: 'rematch' };

export type NdPhase = 'setup' | 'waitingKeeper' | 'watching' | 'guessing' | 'roundResult' | 'over';

export const ND_TOTAL_ROUNDS = 2;
export const ND_ROUND_RECAP_MS = 2600;
export const ND_TURN_SECONDS = 25;
export const ND_STATE_KEY = 'nduel';

/** Host-authoritative snapshot for spectators and late joiners. */
export interface NdSharedState {
  round: number;
  phase: NdPhase;
  attempts: Attempt[];
  counts: { 1?: number; 2?: number };
  keeperName: string;
  guesserName: string;
}

export function isNdSharedState(v: unknown): v is NdSharedState {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.round === 'number'
    && typeof o.phase === 'string'
    && Array.isArray(o.attempts)
    && typeof o.counts === 'object'
    && o.counts !== null
    && typeof o.keeperName === 'string'
    && typeof o.guesserName === 'string'
  );
}

export function isNdMsg(v: unknown): v is NdMsg {
  if (!v || typeof v !== 'object' || !('kind' in v)) return false;
  const k = (v as { kind: unknown }).kind;
  return k === 'ready' || k === 'guess' || k === 'feedback' || k === 'rematch';
}

function namesForRound(round: number, amHost: boolean, meName: string, peerName: string) {
  const keeperName = round === 1 ? (amHost ? meName : peerName) : amHost ? peerName : meName;
  const guesserName = round === 1 ? (amHost ? peerName : meName) : amHost ? meName : peerName;
  return { keeperName, guesserName };
}

export function useNumberDuelGame() {
  const { locale } = useGamesLocale();
  const strings = useMemo(() => getNumberDuelStrings(locale), [locale]);
  const arcade = useMemo(() => getArcadeStrings(locale), [locale]);
  const { self, peer, players, connected, isSpectator, role, sharedState, publishState } = useGameRoom();
  const sharedStateRef = useSharedStateRef(sharedState);
  const { report } = useMatchReporter('number-duel');

  const amHost = self?.role === 'host';
  const meName = self?.name ?? strings.you;
  const peerName = peer?.name ?? strings.partner;

  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<NdPhase>(amHost ? 'setup' : 'waitingKeeper');
  const [secret, setSecret] = useState<number | null>(null);
  const [num, setNum] = useState(50);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [pending, setPending] = useState(false);
  const [counts, setCounts] = useState<{ 1?: number; 2?: number }>({});
  const [fireConfetti, setFireConfetti] = useState(false);
  const [matchGen, setMatchGen] = useState(0);

  const amKeeper = round === 1 ? amHost : !amHost;
  const { keeperName, guesserName } = namesForRound(round, amHost, meName, peerName);

  const myRound1 = amHost ? 2 : 1;
  const peerRound1 = amHost ? 1 : 2;
  const myCount = counts[myRound1 as 1 | 2];
  const peerCount = counts[peerRound1 as 1 | 2];

  const publishSnapshot = useCallback(
    (snap: NdSharedState) => {
      if (role !== 'host') return;
      publishState(mergeNestedRoomState(sharedStateRef.current, ND_STATE_KEY, snap));
    },
    [role, publishState],
  );

  const adoptRemote = useCallback((remote: NdSharedState) => {
    setRound(remote.round);
    setPhase(remote.phase);
    setAttempts(remote.attempts);
    setCounts(remote.counts);
  }, []);

  const startRound = useCallback(
    (r: number) => {
      const keeper = r === 1 ? amHost : !amHost;
      const names = namesForRound(r, amHost, meName, peerName);
      setRound(r);
      setAttempts([]);
      setSecret(null);
      setNum(50);
      setPending(false);
      setFireConfetti(false);
      setPhase(keeper ? 'setup' : 'waitingKeeper');
      if (role === 'host') {
        publishSnapshot({
          round: r,
          phase: keeper ? 'setup' : 'waitingKeeper',
          attempts: [],
          counts,
          keeperName: names.keeperName,
          guesserName: names.guesserName,
        });
      }
    },
    [amHost, meName, peerName, role, counts, publishSnapshot],
  );

  const resetMatch = useCallback(() => {
    setCounts({});
    setMatchGen((g) => g + 1);
    startRound(1);
  }, [startRound]);

  const sendRef = useRef<(msg: NdMsg) => void>(() => {});

  const send = useGameChannel<NdMsg>((msg) => {
    switch (msg.kind) {
      case 'ready':
        if (!isSpectator && !amKeeper) {
          setPhase('guessing');
          playCue('go');
        }
        break;
      case 'guess': {
        if (isSpectator || !amKeeper || secret == null) return;
        const result = evaluateGuess(secret, msg.value);
        const heat = proximityBand(secret, msg.value);
        const frac = proximityFraction(secret, msg.value);
        const count = attempts.length + 1;
        const attempt: Attempt = { value: msg.value, result, heat, frac };
        const nextAttempts = [...attempts, attempt];
        setAttempts(nextAttempts);
        sendRef.current({ kind: 'feedback', value: msg.value, result, heat, frac, count });
        const nextPhase: NdPhase = result === 'correct' ? 'roundResult' : phase;
        const nextCounts = result === 'correct' ? { ...counts, [round]: count } : counts;
        if (result === 'correct') {
          setCounts(nextCounts);
          setPhase('roundResult');
        }
        if (role === 'host') {
          publishSnapshot({
            round,
            phase: nextPhase,
            attempts: nextAttempts,
            counts: nextCounts,
            keeperName,
            guesserName,
          });
        }
        break;
      }
      case 'feedback': {
        if (isSpectator || amKeeper) return;
        setAttempts((a) => [...a, { value: msg.value, result: msg.result, heat: msg.heat, frac: msg.frac }]);
        setPending(false);
        if (msg.result === 'correct') {
          setCounts((c) => ({ ...c, [round]: msg.count }));
          setPhase('roundResult');
        } else {
          playCue(msg.heat === 'burning' || msg.heat === 'hot' ? 'select' : 'tick');
        }
        break;
      }
      case 'rematch':
        resetMatch();
        break;
    }
  }, { validate: isNdMsg });
  sendRef.current = send;

  useEffect(() => {
    if (role === 'host') return;
    const remote = readNestedRoomState(sharedState, ND_STATE_KEY, isNdSharedState);
    if (!remote) return;
    adoptRemote(remote);
  }, [sharedState, role, adoptRemote]);

  const spectatorSnapshot = isSpectator
    ? readNestedRoomState(sharedState, ND_STATE_KEY, isNdSharedState)
    : null;

  useEffect(() => {
    if (phase !== 'roundResult') return;
    const t = setTimeout(() => {
      if (round < ND_TOTAL_ROUNDS) startRound(round + 1);
      else {
        setPhase('over');
        if (role === 'host') {
          publishSnapshot({
            round,
            phase: 'over',
            attempts,
            counts,
            keeperName,
            guesserName,
          });
        }
      }
    }, ND_ROUND_RECAP_MS);
    return () => clearTimeout(t);
  }, [phase, round, startRound, role, attempts, counts, keeperName, guesserName, publishSnapshot]);

  const lockSecret = () => {
    const s = clampNumber(num);
    setSecret(s);
    setNum(50);
    setPhase('watching');
    playCue('select');
    send({ kind: 'ready' });
    if (role === 'host') {
      publishSnapshot({
        round,
        phase: 'watching',
        attempts: [],
        counts,
        keeperName,
        guesserName,
      });
    }
  };

  const submitGuess = useCallback(() => {
    if (pending || phase !== 'guessing') return;
    setPending(true);
    playCue('click');
    send({ kind: 'guess', value: clampNumber(num) });
  }, [pending, phase, num, send]);

  const rematch = useRematch(resetMatch, send);

  useReportOnce(
    phase === 'over',
    () => {
      const host = players.find((p) => p.role === 'host');
      const guest = players.find((p) => p.role !== 'host');
      const hostCount = counts[2] ?? 0;
      const guestCount = counts[1] ?? 0;
      const winner = decideWinner(hostCount, guestCount);
      const roster = [];
      if (host) {
        roster.push({
          peerId: host.id,
          placement: winner === 'host' || winner === 'draw' ? 1 : 2,
          score: hostCount,
        });
      }
      if (guest) {
        roster.push({
          peerId: guest.id,
          placement: winner === 'guest' || winner === 'draw' ? 1 : 2,
          score: guestCount,
        });
      }
      if (roster.length > 0) void report(roster);
    },
    matchGen,
  );

  usePublishState(role === 'host', [round, phase, attempts, counts, keeperName, guesserName], () =>
    publishSnapshot({
      round,
      phase,
      attempts,
      counts,
      keeperName,
      guesserName,
    }),
  );

  return {
    strings,
    arcade,
    connected,
    isSpectator,
    amHost,
    amKeeper,
    meName,
    peerName,
    round,
    phase,
    secret,
    num,
    setNum,
    attempts,
    pending,
    counts,
    fireConfetti,
    setFireConfetti,
    myCount,
    peerCount,
    keeperName,
    guesserName,
    lockSecret,
    submitGuess,
    rematch,
    spectatorSnapshot,
  };
}
