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
    <div className="game-chat-dock overflow-hidden rounded-[1.5rem] border border-white/60 bg-white/72 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="game-chat-dock__toggle flex w-full touch-manipulation items-center gap-2 px-3 py-2.5 text-start transition-colors hover:bg-white/80 dark:hover:bg-white/10"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-cyan-700 dark:text-cyan-200" />
        ) : (
          <MessageCircle className="h-4 w-4 shrink-0 text-cyan-700 dark:text-cyan-200" />
        )}
        <span className="shrink-0 text-xs font-black uppercase tracking-[0.16em] text-slate-800 dark:text-slate-100">
          {t.room.chat}
        </span>
        {!open && lastMessage ? (
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="font-black text-slate-700 dark:text-slate-200">
              {lastMessage.name}:
            </span>{' '}
            {lastMessage.text}
          </span>
        ) : (
          <span className="flex-1" />
        )}
        {unread ? (
          <span className="game-chat-dock__unread shrink-0 rounded-full bg-cyan-600 px-1.5 py-0.5 text-[length:var(--fs-2xs)] font-black leading-none text-white shadow-[0_0_18px_rgba(8,145,178,0.45)] dark:bg-cyan-300 dark:text-slate-950">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="game-chat-dock__body flex flex-col border-t border-white/60 dark:border-white/10">
          <ChatMessageLog
            messages={messages}
            selfId={self?.id}
            emptyMessage={t.room.chatPlaceholder}
            variant="bubble"
            logRef={logRef}
            className="max-h-44 min-h-[2.75rem] overflow-y-auto px-3 py-3 scroll-smooth"
          />

          <div className="game-chat-dock__composer flex items-center gap-1.5 border-t border-white/60 bg-slate-950/5 p-2 dark:border-white/10 dark:bg-slate-950/20">
            <ReactionPicker onPick={sendReaction} label={t.room.reactions} />
            <ChatComposer
              value={draft}
              onChange={setDraft}
              onSubmit={submit}
              placeholder={t.room.chatPlaceholder}
              sendLabel={t.room.send}
              inputClassName="min-h-9 rounded-full border border-white/60 bg-white/80 px-3 font-medium shadow-sm focus:border-cyan-400 focus:ring-2 focus:ring-cyan-300/25 dark:border-white/10 dark:bg-white/5"
              buttonClassName="rounded-full font-black disabled:opacity-35 touch-manipulation"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
