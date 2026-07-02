import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Send, ChevronDown } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { getArcadeStrings, useGamesLocale } from '../locale';
import { useGameRoom } from '../net/useGameRoom';
import { useRoomComms } from '../net/useRoomComms';

const QUICK_REACTIONS = ['👍', '🔥', '😂', '😮', '🎉', '👏', '🧠', '😤'];

/** Room chat log + composer, with a quick-reaction bar. Collapsible. */
export function ChatDock() {
  const { locale } = useGamesLocale();
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
  const { self } = useGameRoom();
  const { messages, sendChat, sendReaction } = useRoomComms();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

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
    <div className="rounded-[var(--radius)] border border-edge bg-panel/70">
      <div className="flex items-center gap-2 border-b border-edge px-2 py-1.5">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => sendReaction(emoji)}
            className="grid h-8 w-8 place-items-center rounded-full text-lg transition-transform hover:scale-125 active:scale-95"
            aria-label={`${t.room.reactions}: ${emoji}`}
          >
            {emoji}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="ms-auto inline-flex min-h-8 items-center gap-1 rounded-full px-2 text-xs font-semibold text-ink3 hover:text-ink"
          aria-expanded={open}
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
          {t.room.chat}
          {!open && messages.length > 0 ? (
            <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">{messages.length}</span>
          ) : null}
        </button>
      </div>

      {open ? (
        <div className="flex flex-col">
          <div ref={logRef} className="max-h-48 min-h-[3rem] overflow-y-auto px-3 py-2" aria-live="polite">
            {messages.length === 0 ? (
              <p className="py-2 text-center text-xs text-ink3">{t.room.chatPlaceholder}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {messages.map((m) => (
                  <li key={m.id} className="text-sm leading-snug">
                    <span
                      className={cn(
                        'font-semibold',
                        m.fromId === self?.id ? 'text-accent' : 'text-ink2',
                      )}
                    >
                      {m.name}:
                    </span>{' '}
                    <span className="text-ink break-words">{m.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-center gap-2 border-t border-edge p-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 240))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
              placeholder={t.room.chatPlaceholder}
              className="min-h-10 flex-1 rounded-full border border-edge bg-panel px-3 text-sm text-ink outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={submit}
              disabled={!draft.trim()}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-white disabled:opacity-40"
              aria-label={t.room.send}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
