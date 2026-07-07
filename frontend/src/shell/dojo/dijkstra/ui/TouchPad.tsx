import { cn } from '@/lib/utils/cn';
import { isSettled } from '../engine/signal';
import { useSignalGame } from '../SignalGameProvider';

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
  const { complete, level, state, handleKey } = useSignalGame();
  if (complete) return null;

  return (
    <div
      className="vim-touchpad flex shrink-0 flex-col min-[960px]:hidden"
      aria-label="Touch controls"
    >
      <div className="vim-touchpad__row">
        {level.nodes.map((node) => (
          <TouchKey
            key={node.key}
            label={String(node.key)}
            tone={isSettled(state, node.key) ? 'muted' : 'default'}
            title={`settle ${node.name}`}
            onPress={() => handleKey(String(node.key))}
          />
        ))}
      </div>
      <div className="vim-touchpad__row">
        <TouchKey label="r" tone="muted" title="restart level" onPress={() => handleKey('r')} />
      </div>
      <p className="vim-touchpad__hint">settle the smallest tentative distance</p>
    </div>
  );
}
