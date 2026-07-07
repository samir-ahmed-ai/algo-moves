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

  const latestReaction = (id: string) =>
    reactions.filter((r) => r.fromId === id).slice(-1)[0]?.emoji;

  return (
    <div className="flex flex-col gap-3">
      <div>
        {!compact ? (
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink3">
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
              reaction={latestReaction(p.id)}
              hostLabel={t.room.hostBadge}
              youLabel={t.room.youBadge}
              compact={compact}
            />
          ))}
        </ul>
      </div>

      {spectators.length > 0 ? (
        <div className="flex items-center gap-2 text-ink3">
          <Eye className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">{t.room.spectatorCount(spectators.length)}</span>
          <div className="flex -space-x-1.5">
            {spectators.slice(0, 6).map((s) => (
              <Avatar key={s.id} seed={s.id} name={s.name} size={20} className="ring-1 ring-bg" />
            ))}
            {spectators.length > 6 ? (
              <span className="grid h-5 w-5 place-items-center rounded-full bg-panel2 text-[length:var(--fs-2xs)] font-bold text-ink3">
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
  reaction?: string;
  hostLabel: string;
  youLabel: string;
  compact: boolean;
}) {
  const isHost = peer.role === 'host';
  return (
    <li
      className={cn(
        'relative inline-flex items-center gap-2 rounded-full border py-1 ps-1 pe-3 transition-colors',
        isReady ? 'border-good/50 bg-good/10' : 'border-edge bg-panel',
      )}
    >
      <span className="relative">
        <Avatar seed={peer.id} name={peer.name} size={compact ? 24 : 28} />
        {reaction ? (
          <span className="absolute -right-1 -top-2 animate-bounce text-sm" aria-hidden>
            {reaction}
          </span>
        ) : null}
      </span>
      <span className="flex items-center gap-1 text-sm font-medium text-ink">
        {isHost ? <Crown className="h-3.5 w-3.5 text-amber-500" aria-label={hostLabel} /> : null}
        <span className="max-w-[9rem] truncate">{peer.name}</span>
        {isSelf ? (
          <span className="text-[length:var(--fs-2xs)] font-semibold text-ink3">({youLabel})</span>
        ) : null}
        {isReady ? <Check className="h-3.5 w-3.5 text-good" /> : null}
      </span>
    </li>
  );
}
