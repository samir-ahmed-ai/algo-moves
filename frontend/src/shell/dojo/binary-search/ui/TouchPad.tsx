import { cn } from '@/lib/utils/cn';
import { useBisectGame } from '../BisectGameProvider';

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
  const { complete, empty, state, handleKey } = useBisectGame();
  if (complete) return null;

  const needsProbe = !empty && state.probedMid === null;

  return (
    <div
      className="vim-touchpad flex shrink-0 flex-col min-[960px]:hidden"
      aria-label="Touch controls"
    >
      <div className="vim-touchpad__row">
        <TouchKey
          label="m"
          tone={needsProbe ? 'accent' : 'default'}
          title="flip the middle card"
          onPress={() => handleKey('m')}
        />
        <TouchKey label="l" title="discard the left half" onPress={() => handleKey('l')} />
        <TouchKey label="h" title="discard the right half" onPress={() => handleKey('h')} />
        <TouchKey
          label="x"
          tone={empty ? 'accent' : 'default'}
          title="declare the target absent"
          onPress={() => handleKey('x')}
        />
      </div>
      <div className="vim-touchpad__row">
        <TouchKey label="r" tone="muted" title="restart level" onPress={() => handleKey('r')} />
      </div>
      <p className="vim-touchpad__hint">m flips the middle · l/h discard a half</p>
    </div>
  );
}
