import { Send } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  sendLabel?: string;
  maxLength?: number;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
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
    <div className={cn('flex items-center gap-1.5', className)}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit();
        }}
        placeholder={placeholder}
        className={cn(
          'min-w-0 flex-1 border border-edge bg-panel2 px-2 py-1.5 text-sm text-ink outline-none transition-colors placeholder:text-ink3 focus:border-accent',
          inputClassName,
        )}
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={!value.trim()}
        className={cn(
          'grid h-8 w-8 shrink-0 place-items-center bg-accent text-white disabled:opacity-40',
          buttonClassName,
        )}
        aria-label={sendLabel}
      >
        <Send className="h-3 w-3" />
      </button>
    </div>
  );
}
