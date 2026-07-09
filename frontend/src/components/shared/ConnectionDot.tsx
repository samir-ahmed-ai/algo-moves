import { cn } from '@/lib/utils/cn';

/**
 * Realtime connection status indicator — a glowing dot that turns green when
 * open, pulses amber while connecting/reconnecting, and goes red when the room
 * is closed or errored. Shared by the arcade, interview, and collab surfaces.
 */
export function ConnectionDot({
  status,
  className,
}: {
  status: 'open' | 'connecting' | 'closed' | 'error';
  className?: string;
}) {
  const tone =
    status === 'open'
      ? 'bg-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.7)]'
      : status === 'connecting'
        ? 'animate-pulse bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.7)]'
        : 'bg-red-500 shadow-[0_0_16px_rgba(239,68,68,0.55)]';
  return (
    <span
      className={cn(
        'inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white/70 dark:ring-slate-950/80',
        tone,
        className,
      )}
      aria-hidden
    />
  );
}
