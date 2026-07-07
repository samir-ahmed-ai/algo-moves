import { useMemo } from 'react';
import { Crown, Check, Eye } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { getArcadeStrings, useGamesLocale } from '../locale';
import { useGameRoom } from '../net/useGameRoom';
import { useRoomComms } from '../net/useRoomComms';
import { Avatar } from '../ui/Avatar';
import type { Peer } from '../net/protocol';

/** The live room roster: seated players (with host / ready badges) + spectators. */
export function Roster({ compact = false }: { compact?: boolean }) {
  const { locale } = useGamesLocale();
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
  const { players, spectators, self } = useGameRoom();
  const { readyIds, reactions } = useRoomComms();

  const reactionsByPeer = useMemo(() => {
    const latest = new Map<string, string>();
    for (const reaction of reactions) latest.set(reaction.fromId, reaction.emoji);
    return latest;
  }, [reactions]);

  return (
    <div className={cn('game-roster flex flex-col gap-3', compact && 'game-roster--compact')}>
      <div>
        {!compact ? (
          <p className="game-roster__label mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {t.room.players} · {players.length}
          </p>
        ) : null}
        <ul className={cn('flex flex-wrap gap-2', compact && 'gap-1.5')}>
          {players.map((p) => (
            <PlayerChip
              key={p.id}
              peer={p}
              isSelf={p.id === self?.id}
              isReady={readyIds.has(p.id)}
              reaction={reactionsByPeer.get(p.id)}
              hostLabel={t.room.hostBadge}
              youLabel={t.room.youBadge}
              compact={compact}
            />
          ))}
        </ul>
      </div>

      {spectators.length > 0 ? (
        <div className="game-roster__spectators flex items-center gap-2 rounded-2xl border border-white/60 bg-white/65 px-3 py-2 text-slate-500 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
          <Eye className="h-3.5 w-3.5" />
          <span className="text-xs font-bold">{t.room.spectatorCount(spectators.length)}</span>
          <div className="flex -space-x-1.5">
            {spectators.slice(0, 6).map((s) => (
              <Avatar
                key={s.id}
                seed={s.id}
                name={s.name}
                size={20}
                className="ring-2 ring-white dark:ring-slate-950"
              />
            ))}
            {spectators.length > 6 ? (
              <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-950 text-[length:var(--fs-2xs)] font-black text-white dark:bg-white dark:text-slate-950">
                +{spectators.length - 6}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PlayerChip({
  peer,
  isSelf,
  isReady,
  reaction,
  hostLabel,
  youLabel,
  compact,
}: {
  peer: Peer;
  isSelf: boolean;
  isReady: boolean;
  reaction: string | undefined;
  hostLabel: string;
  youLabel: string;
  compact: boolean;
}) {
  const isHost = peer.role === 'host';
  return (
    <li
      className={cn(
        'game-player-chip relative inline-flex items-center gap-2 rounded-full border py-1 ps-1 pe-3 shadow-sm backdrop-blur transition',
        isReady
          ? 'border-emerald-300/45 bg-emerald-100/80 text-emerald-900 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100'
          : 'border-white/60 bg-white/70 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200',
        isSelf && 'ring-2 ring-cyan-300/35',
      )}
    >
      <span className="relative">
        <Avatar seed={peer.id} name={peer.name} size={compact ? 24 : 28} />
        {reaction ? (
          <span className="absolute -right-1 -top-2 animate-bounce text-sm drop-shadow" aria-hidden>
            {reaction}
          </span>
        ) : null}
      </span>
      <span className="flex items-center gap-1 text-sm font-bold">
        {isHost ? <Crown className="h-3.5 w-3.5 text-amber-500" aria-label={hostLabel} /> : null}
        <span className="max-w-[9rem] truncate">{peer.name}</span>
        {isSelf ? (
          <span className="text-[length:var(--fs-2xs)] font-black text-cyan-700 dark:text-cyan-200">
            ({youLabel})
          </span>
        ) : null}
        {isReady ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-200" /> : null}
      </span>
    </li>
  );
}
