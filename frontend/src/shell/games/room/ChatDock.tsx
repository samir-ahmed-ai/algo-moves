import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Send, ChevronDown, SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { getArcadeStrings, useGamesLocale } from '../locale';
import { useGameRoom } from '../net/useGameRoom';
import { useRoomComms } from '../net/useRoomComms';
import { usePopoverDismiss } from '@/shell/ui/usePopoverDismiss';

const REACTIONS = [
  '👍',
  '👎',
  '❤️',
  '🔥',
  '😂',
  '😮',
  '😢',
  '🎉',
  '👏',
  '🧠',
  '😤',
  '💀',
  '🎯',
  '⚡',
  '🏆',
  '💪',
  '😎',
  '🤔',
  '😱',
  '🙈',
  '🤝',
  '👀',
  '💯',
  '🫡',
] as const;

/** Compact emoji grid that opens on hover or tap. */
function ReactionPicker({ onPick, label }: { onPick: (emoji: string) => void; label: string }) {
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
            {REACTIONS.map((emoji) => (
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

/** Room chat log + composer. Reactions live in a compact hover panel. Collapsible. */
export function ChatDock() {
  const { locale } = useGamesLocale();
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
  const { self } = useGameRoom();
  const { messages, sendChat, sendReaction } = useRoomComms();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [readThrough, setReadThrough] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);

  const lastMessage = messages[messages.length - 1];
  const unreadCount = Math.max(0, messages.length - readThrough);
  const unread = !open && unreadCount > 0;

  useEffect(() => {
    if (open) setReadThrough(messages.length);
  }, [open, messages.length]);

  useEffect(() => {
    if (open && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, open]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    sendChat(text);
    setDraft('');
  };

  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-edge bg-panel/70">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-2.5 py-2 text-start transition-colors hover:bg-panel2/60 touch-manipulation"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-ink3" />
        ) : (
          <MessageCircle className="h-4 w-4 shrink-0 text-ink3" />
        )}
        <span className="shrink-0 text-xs font-semibold text-ink">{t.room.chat}</span>
        {!open && lastMessage ? (
          <span className="min-w-0 flex-1 truncate text-xs text-ink3">
            <span className="font-medium text-ink2">{lastMessage.name}:</span> {lastMessage.text}
          </span>
        ) : (
          <span className="flex-1" />
        )}
        {unread ? (
          <span className="shrink-0 rounded-full bg-accent px-1.5 py-px text-[length:var(--fs-2xs)] font-bold leading-none text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="flex flex-col border-t border-edge">
          <div
            ref={logRef}
            className="max-h-44 min-h-[2.75rem] overflow-y-auto px-2 py-2 scroll-smooth"
            aria-live="polite"
          >
            {messages.length === 0 ? (
              <p className="py-3 text-center text-[length:var(--fs-tight)] text-ink3">
                {t.room.chatPlaceholder}
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {messages.map((m) => {
                  const isSelf = m.fromId === self?.id;
                  return (
                    <li key={m.id} className={cn('flex', isSelf ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[88%] rounded-2xl px-2.5 py-1 text-sm leading-snug',
                          isSelf
                            ? 'rounded-br-md bg-accent/12 text-ink'
                            : 'rounded-bl-md bg-panel2 text-ink',
                        )}
                      >
                        {!isSelf ? (
                          <span className="mb-px block text-[length:var(--fs-2xs)] font-semibold leading-none text-ink3">
                            {m.name}
                          </span>
                        ) : null}
                        <span className="break-words">{m.text}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex items-center gap-1.5 border-t border-edge p-1.5">
            <ReactionPicker onPick={sendReaction} label={t.room.reactions} />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 240))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
              placeholder={t.room.chatPlaceholder}
              className="min-h-8 flex-1 rounded-full border border-edge bg-panel px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink3 focus:border-accent"
            />
            <button
              type="button"
              onClick={submit}
              disabled={!draft.trim()}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-white transition-opacity disabled:opacity-35 touch-manipulation"
              aria-label={t.room.send}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
