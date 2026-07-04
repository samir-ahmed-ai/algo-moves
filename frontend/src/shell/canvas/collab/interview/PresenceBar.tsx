import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '../../../chromeUi';
import { RADIUS_CTRL } from '../../ui/nodeui';
import { useCanvasCollab } from '../CanvasCollabProvider';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface Seat {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
}

const MAX_AVATARS = 5;

/** Overlapping avatar roster + connection status for the interview HUD. */
export function PresenceBar() {
  const { self, players, peers, status } = useCanvasCollab();
  const colorOf = (id: string) => peers.find((p) => p.id === id)?.color ?? 'var(--accent)';

  const seats: Seat[] = [];
  if (self) seats.push({ id: self.id, name: self.name, color: 'var(--accent)', isHost: self.role === 'host' });
  for (const p of players) {
    if (p.id === self?.id) continue;
    seats.push({ id: p.id, name: p.name, color: colorOf(p.id), isHost: p.role === 'host' });
  }

  const shown = seats.slice(0, MAX_AVATARS);
  const overflow = seats.length - shown.length;

  const dot =
    status === 'open' ? 'bg-good' : status === 'connecting' ? 'bg-amber-500' : 'bg-bad';
  const label = status === 'open' ? 'Live' : status === 'connecting' ? 'Connecting' : 'Offline';

  return (
    <div className={cn('inline-flex items-center gap-2 border border-edge bg-panel px-2.5 py-1', RADIUS_CTRL)}>
      <span className="flex items-center">
        {shown.map((s, i) => (
          <span
            key={s.id}
            title={s.name}
            className={cn(
              'relative grid h-6 w-6 place-items-center rounded-full border-2 border-panel font-semibold text-white',
              chromeText.xs,
              i > 0 && '-ml-2',
            )}
            style={{ background: s.color }}
          >
            {initials(s.name)}
            {s.isHost ? (
              <Crown className="absolute -right-1 -top-1 h-2.5 w-2.5 text-amber-400" aria-label="Host" />
            ) : null}
          </span>
        ))}
        {overflow > 0 ? (
          <span
            className={cn(
              '-ml-2 grid h-6 w-6 place-items-center rounded-full border-2 border-panel bg-panel2 font-semibold text-ink2',
              chromeText.xs,
            )}
          >
            +{overflow}
          </span>
        ) : null}
      </span>
      <span className="flex items-center gap-1 text-ink3">
        <span className={cn('h-1.5 w-1.5 rounded-full', dot)} aria-hidden />
        <span className={chromeText.xs}>{label}</span>
      </span>
    </div>
  );
}
