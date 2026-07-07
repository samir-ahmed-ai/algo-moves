import { cn } from '@/lib/utils/cn';
import type { PeerPresence } from '../CanvasCollabProvider';
import { chromeText } from '../../chromeUi';

const MAX = 3;

/** Compact peer dots for panel headers — shows who is focused on this node. */
export function NodePresenceAvatars({
  peers,
  nodeId,
  className,
}: {
  peers: PeerPresence[];
  nodeId: string;
  className?: string;
}) {
  const here = peers.filter((p) => p.selection.includes(nodeId));
  if (here.length === 0) return null;

  const shown = here.slice(0, MAX);
  const extra = here.length - shown.length;

  return (
    <span className={cn('inline-flex items-center -space-x-1', className)} aria-label={`${here.length} collaborator(s) on this panel`}>
      {shown.map((p) => (
        <span
          key={p.id}
          title={p.name}
          className={cn(
            'inline-flex h-4 w-4 items-center justify-center rounded-full border border-panel font-semibold text-white',
            chromeText.tight,
          )}
          style={{ background: p.color }}
        >
          {p.name.charAt(0).toUpperCase()}
        </span>
      ))}
      {extra > 0 ? (
        <span className={cn('pl-1.5 font-medium text-ink3', chromeText.tight)}>+{extra}</span>
      ) : null}
    </span>
  );
}
