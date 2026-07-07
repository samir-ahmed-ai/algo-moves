import { useRef, useState } from 'react';
import { SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { usePopoverDismiss } from '@/lib/hooks/usePopoverDismiss';
import { CHAT_REACTIONS, QUICK_CHAT_REACTIONS } from './reactions';

export interface ReactionBarProps {
  reactions?: readonly string[];
  onPick: (emoji: string) => void;
  getLabel?: (emoji: string) => string;
  className?: string | undefined;
  buttonClassName?: string | undefined;
}

export function ReactionBar({
  reactions = QUICK_CHAT_REACTIONS,
  onPick,
  getLabel = (emoji) => `React ${emoji}`,
  className,
  buttonClassName,
}: ReactionBarProps) {
  return (
    <div className={cn('reaction-bar flex items-center gap-0.5', className)}>
      {reactions.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onPick(emoji)}
          className={cn(
            'grid h-7 w-7 place-items-center rounded-full bg-white/64 text-sm shadow-sm ring-1 ring-white/60 transition hover:-translate-y-0.5 hover:scale-110 hover:bg-white active:scale-95 dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10',
            'reaction-bar__button',
            buttonClassName,
          )}
          aria-label={getLabel(emoji)}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export interface ReactionPickerProps {
  onPick: (emoji: string) => void;
  label: string;
  reactions?: readonly string[] | undefined;
}

/** Compact emoji grid that opens on hover or tap. */
export function ReactionPicker({ onPick, label, reactions = CHAT_REACTIONS }: ReactionPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  usePopoverDismiss(rootRef, open, () => setOpen(false));

  const pick = (emoji: string) => {
    onPick(emoji);
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className="reaction-picker relative shrink-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'grid h-9 w-9 touch-manipulation place-items-center rounded-full border border-white/60 bg-white/76 text-slate-500 shadow-sm transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/5 dark:text-slate-300',
          'reaction-picker__trigger',
          'hover:border-cyan-300/50 hover:bg-white hover:text-cyan-700 dark:hover:bg-white/10 dark:hover:text-cyan-200',
          open &&
            'border-cyan-300/50 bg-cyan-50/90 text-cyan-800 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-100',
        )}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <SmilePlus className="h-4 w-4" />
      </button>

      {open ? (
        <div
          className={cn(
            'absolute bottom-[calc(100%+8px)] left-0 z-50 w-[10.5rem]',
            'rounded-2xl border border-white/60 bg-white/92 p-1.5 shadow-[0_20px_58px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/92',
            'animate-in fade-in slide-in-from-bottom-1 duration-150',
            'reaction-picker__panel',
          )}
          role="menu"
        >
          <div className="reaction-picker__grid grid grid-cols-6 gap-px">
            {reactions.map((emoji) => (
              <button
                key={emoji}
                type="button"
                role="menuitem"
                onClick={() => pick(emoji)}
                className={cn(
                  'grid h-7 w-7 touch-manipulation place-items-center rounded-xl text-[length:var(--fs-title)] leading-none transition',
                  'hover:-translate-y-0.5 hover:bg-cyan-50 active:scale-95 dark:hover:bg-white/10',
                  'reaction-picker__emoji',
                )}
                aria-label={`${label}: ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
