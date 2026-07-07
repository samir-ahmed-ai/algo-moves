import { cn } from '@/lib/utils/cn';
import { useWindowGame } from '../WindowGameProvider';

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
  const { complete, handleKey } = useWindowGame();
  if (complete) return null;

  return (
    <div
      className="vim-touchpad flex shrink-0 flex-col min-[960px]:hidden"
      aria-label="Touch controls"
    >
      <div className="vim-touchpad__row">
        <TouchKey label="h" title="shrink — drop the left chip" onPress={() => handleKey('h')} />
        <TouchKey label="l" title="grow — extend R right" onPress={() => handleKey('l')} />
      </div>
      <div className="vim-touchpad__row">
        <TouchKey label="r" tone="muted" title="restart level" onPress={() => handleKey('r')} />
      </div>
      <p className="vim-touchpad__hint">l grows the window · h shrinks it</p>
    </div>
  );
}
