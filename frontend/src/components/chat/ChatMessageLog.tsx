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
  selfId?: string | null;
  emptyMessage?: string;
  variant?: 'bubble' | 'inline';
  className?: string;
  logRef?: RefObject<HTMLDivElement>;
  nameClassName?: string;
  textClassName?: string;
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
        <p className="chat-message-log__empty py-2 text-center text-ink3">{emptyMessage}</p>
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
                    'max-w-[88%] rounded-2xl px-2.5 py-1 text-sm leading-snug',
                    'chat-message-log__bubble',
                    isSelf
                      ? 'chat-message-log__bubble--self rounded-br-md bg-accent/12 text-ink'
                      : 'rounded-bl-md bg-panel2 text-ink',
                  )}
                >
                  {!isSelf ? (
                    <span className="chat-message-log__name mb-px block text-[length:var(--fs-2xs)] font-semibold leading-none text-ink3">
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
                'chat-message-log__inline-name font-semibold',
                m.fromId === selfId ? 'text-accent' : 'text-ink2',
                nameClassName,
              )}
            >
              {m.name}:
            </span>{' '}
            <span className="chat-message-log__inline-text break-words text-ink">{m.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
