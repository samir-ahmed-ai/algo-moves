import { cn } from '@/lib/utils/cn';
import { useSkylineGame } from '../SkylineGameProvider';

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
  const { complete, sweeping, mustPopNow, canPushNow, handleKey } = useSkylineGame();
  if (complete) return null;

  return (
    <div
      className="vim-touchpad flex shrink-0 flex-col min-[960px]:hidden"
      aria-label="Touch controls"
    >
      <div className="vim-touchpad__row">
        <TouchKey
          label="p"
          tone={mustPopNow && !sweeping ? 'accent' : 'default'}
          title="pop the shorter stack top"
          onPress={() => handleKey('p')}
        />
        <TouchKey
          label="↵"
          tone={canPushNow && !sweeping ? 'accent' : 'default'}
          title="push the incoming bar"
          onPress={() => handleKey('Enter')}
        />
        <TouchKey label="r" tone="muted" title="restart level" onPress={() => handleKey('r')} />
      </div>
      <p className="vim-touchpad__hint">p pops the shorter top · ↵ pushes the incoming bar</p>
    </div>
  );
}
