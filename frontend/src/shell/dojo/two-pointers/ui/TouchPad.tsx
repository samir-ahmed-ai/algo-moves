import { cn } from '@/lib/utils/cn';
import { usePincerGame } from '../PincerGameProvider';

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
  const { complete, crossed, sum, level, handleKey } = usePincerGame();
  if (complete) return null;

  const onTarget = !crossed && sum === level.target;

  return (
    <div
      className="vim-touchpad flex shrink-0 flex-col min-[960px]:hidden"
      aria-label="Touch controls"
    >
      <div className="vim-touchpad__row">
        <TouchKey label="h" title="walk R left" onPress={() => handleKey('h')} />
        <TouchKey label="l" title="walk L right" onPress={() => handleKey('l')} />
        <TouchKey
          label="↵"
          tone={onTarget ? 'accent' : 'default'}
          title="claim the pair"
          onPress={() => handleKey('Enter')}
        />
        <TouchKey
          label="x"
          tone={crossed ? 'accent' : 'default'}
          title="declare no pair exists"
          onPress={() => handleKey('x')}
        />
      </div>
      <div className="vim-touchpad__row">
        <TouchKey label="r" tone="muted" title="restart level" onPress={() => handleKey('r')} />
      </div>
      <p className="vim-touchpad__hint">h walks R left · l walks L right</p>
    </div>
  );
}
