import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, ChevronDown } from 'lucide-react';
import { ChatComposer, ChatMessageLog, ReactionPicker } from '@/components/chat';
import { getArcadeStrings, useGamesLocale } from '../locale';
import { useGameRoom } from '../net/useGameRoom';
import { useRoomComms } from '../net/useRoomComms';

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
          <ChatMessageLog
            messages={messages}
            selfId={self?.id}
            emptyMessage={t.room.chatPlaceholder}
            variant="bubble"
            logRef={logRef}
            className="max-h-44 min-h-[2.75rem] overflow-y-auto px-2 py-2 scroll-smooth"
          />

          <div className="flex items-center gap-1.5 border-t border-edge p-1.5">
            <ReactionPicker onPick={sendReaction} label={t.room.reactions} />
            <ChatComposer
              value={draft}
              onChange={setDraft}
              onSubmit={submit}
              placeholder={t.room.chatPlaceholder}
              sendLabel={t.room.send}
              inputClassName="min-h-8 rounded-full border border-edge bg-panel px-3"
              buttonClassName="rounded-full disabled:opacity-35 touch-manipulation"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
