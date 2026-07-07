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
      <div ref={logRef} className={className} aria-live="polite">
        <p className="py-2 text-center text-ink3">{emptyMessage}</p>
      </div>
    );
  }

  if (variant === 'bubble') {
    return (
      <div ref={logRef} className={className} aria-live="polite">
        <ul className="flex flex-col gap-1">
          {messages.map((m) => {
            const isSelf = m.fromId === selfId;
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
      </div>
    );
  }

  return (
    <div ref={logRef} className={className} aria-live="polite">
      <ul className="flex flex-col gap-1">
        {messages.map((m) => (
          <li key={m.id} className={cn('leading-snug', textClassName)}>
            <span
              className={cn(
                'font-semibold',
                m.fromId === selfId ? 'text-accent' : 'text-ink2',
                nameClassName,
              )}
            >
              {m.name}:
            </span>{' '}
            <span className="break-words text-ink">{m.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
