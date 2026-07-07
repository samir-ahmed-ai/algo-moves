import { cn } from '@/lib/utils/cn';
import { useFloodGame } from '../FloodGameProvider';

function TouchKey({
  label,
  onPress,
  tone = 'default',
  title,
}: {
  label: string;
  onPress: () => void;
  tone?: 'default' | 'accent' | 'muted';
  title?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        'vim-touch-key',
        tone === 'accent' && 'vim-touch-key--accent',
        tone === 'muted' && 'vim-touch-key--muted',
      )}
      onClick={onPress}
      title={title}
      aria-label={title ? `${label} — ${title}` : label}
    >
      {label}
    </button>
  );
}

export function TouchPad() {
  const { complete, state, handleKey } = useFloodGame();
  if (complete) return null;

  const inQueue = (n: number) => n <= state.queue.length;
  const digit = (n: number) => (
    <TouchKey
      key={n}
      label={String(n)}
      tone={n === 1 ? 'accent' : inQueue(n) ? 'default' : 'muted'}
      title={n === 1 ? 'expand the head (oldest)' : `pick frontier cell #${n}`}
      onPress={() => handleKey(String(n))}
    />
  );

  return (
    <div
      className="vim-touchpad flex shrink-0 flex-col min-[960px]:hidden"
      aria-label="Touch controls"
    >
      <div className="vim-touchpad__row">{[1, 2, 3, 4, 5].map(digit)}</div>
      <div className="vim-touchpad__row">{[6, 7, 8, 9].map(digit)}</div>
      <div className="vim-touchpad__row">
        <TouchKey
          label="↵"
          tone="accent"
          title="expand the head of the queue"
          onPress={() => handleKey('Enter')}
        />
        <TouchKey label="r" tone="muted" title="restart level" onPress={() => handleKey('r')} />
      </div>
      <p className="vim-touchpad__hint">1 expands the head — BFS serves the oldest first</p>
    </div>
  );
}
