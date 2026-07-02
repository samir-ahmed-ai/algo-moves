import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = nextId.current++;
    setToasts((cur) => [...cur, { id, message, tone }]);
    setTimeout(() => setToasts((cur) => cur.filter((t) => t.id !== id)), TOAST_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 [padding-bottom:env(safe-area-inset-bottom)]"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto max-w-sm rounded-full border px-4 py-2 text-sm font-medium shadow-[var(--shadow-lg)] backdrop-blur',
              t.tone === 'good' && 'border-good/40 bg-good/15 text-good',
              t.tone === 'bad' && 'border-bad/40 bg-bad/15 text-bad',
              t.tone === 'info' && 'border-edge bg-panel/90 text-ink',
            )}
          >
            {t.message}
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
