import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type ToastTone = 'info' | 'good' | 'bad';
interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastApi {
  push: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
const TOAST_MS = 2600;
const MAX_TOASTS = 3;

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === 'good') return <CheckCircle2 className="h-4 w-4" aria-hidden />;
  if (tone === 'bad') return <AlertCircle className="h-4 w-4" aria-hidden />;
  return <Info className="h-4 w-4" aria-hidden />;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = nextId.current++;
    setToasts((cur) => [...cur, { id, message, tone }].slice(-MAX_TOASTS));
    setTimeout(() => setToasts((cur) => cur.filter((t) => t.id !== id)), TOAST_MS);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 [padding-bottom:env(safe-area-inset-bottom)]"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex max-w-sm items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold shadow-theme-lg backdrop-blur-xl',
              t.tone === 'good' && 'border-good/40 bg-goodbg text-good',
              t.tone === 'bad' && 'border-bad/40 bg-badbg text-bad',
              t.tone === 'info' && 'border-edge bg-[var(--surface-glass)] text-ink',
            )}
          >
            <ToastIcon tone={t.tone} />
            <span className="min-w-0 flex-1 truncate">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-current opacity-65 transition hover:bg-panel/60 hover:opacity-100"
              aria-label="Dismiss notification"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Returns a `push(message, tone?)` fn. Safe no-op if no provider is mounted. */
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? { push: () => {} };
}
