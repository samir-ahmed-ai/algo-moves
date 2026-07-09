import { useEffect, useRef } from 'react';

/** Fading swipe-gesture hint that disappears after a few seconds. */
export function SwipeHint({ message }: { message: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const t = setTimeout(() => {
      el.style.transition = 'opacity 0.6s';
      el.style.opacity = '0';
    }, 3000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      ref={ref}
      className="game-swipe-hint flex items-center justify-center gap-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400"
    >
      <span className="animate-[swipeArrow_1s_ease-in-out_infinite]">👆</span>
      <span>{message}</span>
      <style>{`
        @keyframes swipeArrow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
