import { useRef, useState } from 'react';
import { SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { usePopoverDismiss } from '@/lib/hooks/usePopoverDismiss';
import { CHAT_REACTIONS, QUICK_CHAT_REACTIONS } from './reactions';

export interface ReactionBarProps {
  reactions?: readonly string[];
  onPick: (emoji: string) => void;
  getLabel?: (emoji: string) => string;
  className?: string;
  buttonClassName?: string;
}

export function ReactionBar({
  reactions = QUICK_CHAT_REACTIONS,
  onPick,
  getLabel = (emoji) => `React ${emoji}`,
  className,
  buttonClassName,
}: ReactionBarProps) {
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {reactions.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onPick(emoji)}
          className={cn(
            'grid h-6 w-6 place-items-center rounded-full text-sm transition-transform hover:scale-125 active:scale-95',
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
  reactions?: readonly string[];
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
      className="relative shrink-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'grid h-8 w-8 place-items-center rounded-full border border-edge bg-panel text-ink3 transition-colors touch-manipulation',
          'hover:border-accent/40 hover:bg-panel2 hover:text-accent',
          open && 'border-accent/50 bg-accentbg text-accent',
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
            'absolute bottom-[calc(100%+6px)] left-0 z-50 w-[10.5rem]',
            'rounded-xl border border-edge/80 bg-panel/95 p-1 shadow-theme-lg backdrop-blur-sm',
            'animate-in fade-in slide-in-from-bottom-1 duration-150',
          )}
          role="menu"
        >
          <div className="grid grid-cols-6 gap-px">
            {reactions.map((emoji) => (
              <button
                key={emoji}
                type="button"
                role="menuitem"
                onClick={() => pick(emoji)}
                className={cn(
                  'grid h-7 w-7 place-items-center rounded-md text-[length:var(--fs-title)] leading-none transition-transform touch-manipulation',
                  'hover:scale-110 hover:bg-panel2 active:scale-95',
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
