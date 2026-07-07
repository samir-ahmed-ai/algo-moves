import { type RefObject } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ChatLogMessage {
  id: string;
  fromId: string;
  name: string;
  text: string;
}

export interface ChatMessageLogProps {
  messages: ChatLogMessage[];
  selfId?: string | null | undefined;
  emptyMessage?: string | undefined;
  variant?: 'bubble' | 'inline' | undefined;
  className?: string | undefined;
  logRef?: RefObject<HTMLDivElement> | undefined;
  nameClassName?: string | undefined;
  textClassName?: string | undefined;
}

export function ChatMessageLog({
  messages,
  selfId,
  emptyMessage = 'No messages yet.',
  variant = 'inline',
  className,
  logRef,
  nameClassName,
  textClassName,
}: ChatMessageLogProps) {
  if (messages.length === 0) {
    return (
      <div
        ref={logRef}
        className={cn('chat-message-log chat-message-log--empty', className)}
        aria-live="polite"
      >
        <p className="chat-message-log__empty py-2 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
          {emptyMessage}
        </p>
      </div>
    );
  }

  if (variant === 'bubble') {
    return (
      <div
        ref={logRef}
        className={cn('chat-message-log chat-message-log--bubble', className)}
        aria-live="polite"
      >
        <ul className="chat-message-log__list flex flex-col gap-1">
          {messages.map((m) => {
            const isSelf = m.fromId === selfId;
            return (
              <li
                key={m.id}
                className={cn(
                  'chat-message-log__item flex',
                  isSelf ? 'chat-message-log__item--self justify-end' : 'justify-start',
                )}
              >
                <div
                  className={cn(
                    'max-w-[88%] rounded-2xl px-3 py-2 text-sm font-medium leading-snug shadow-sm',
                    'chat-message-log__bubble',
                    isSelf
                      ? 'chat-message-log__bubble--self rounded-br-md bg-cyan-50/90 text-cyan-950 dark:bg-cyan-300/12 dark:text-cyan-50'
                      : 'rounded-bl-md bg-white/76 text-slate-800 dark:bg-white/8 dark:text-slate-100',
                  )}
                >
                  {!isSelf ? (
                    <span className="chat-message-log__name mb-px block text-[length:var(--fs-2xs)] font-black leading-none text-slate-500 dark:text-slate-400">
                      {m.name}
                    </span>
                  ) : null}
                  <span className="chat-message-log__text break-words">{m.text}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div
      ref={logRef}
      className={cn('chat-message-log chat-message-log--inline', className)}
      aria-live="polite"
    >
      <ul className="chat-message-log__list flex flex-col gap-1">
        {messages.map((m) => (
          <li
            key={m.id}
            className={cn('chat-message-log__inline-item leading-snug', textClassName)}
          >
            <span
              className={cn(
                'chat-message-log__inline-name font-black',
                m.fromId === selfId
                  ? 'text-cyan-700 dark:text-cyan-200'
                  : 'text-slate-600 dark:text-slate-300',
                nameClassName,
              )}
            >
              {m.name}:
            </span>{' '}
            <span className="chat-message-log__inline-text break-words text-slate-800 dark:text-slate-100">
              {m.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
