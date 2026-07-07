import { Send } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string | undefined;
  sendLabel?: string | undefined;
  maxLength?: number | undefined;
  className?: string | undefined;
  inputClassName?: string | undefined;
  buttonClassName?: string | undefined;
}

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  placeholder = 'Message…',
  sendLabel = 'Send',
  maxLength = 240,
  className,
  inputClassName,
  buttonClassName,
}: ChatComposerProps) {
  return (
    <div className={cn('chat-composer flex items-center gap-1.5', className)}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit();
        }}
        placeholder={placeholder}
        className={cn(
          'min-w-0 flex-1 border border-white/60 bg-white/76 px-3 py-2 text-sm font-medium text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-300/25 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500',
          'chat-composer__input',
          inputClassName,
        )}
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={!value.trim()}
        className={cn(
          'grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-950 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-40 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-50',
          'chat-composer__send',
          buttonClassName,
        )}
        aria-label={sendLabel}
      >
        <Send className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
