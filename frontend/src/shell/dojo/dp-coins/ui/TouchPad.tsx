import { cn } from '@/lib/utils/cn';
import { bestCandidates } from '../engine/forge';
import { useForgeGame } from '../ForgeGameProvider';

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
  const { complete, level, dp, cursor, handleKey } = useForgeGame();
  if (complete) return null;

  const mustStamp = cursor !== -1 && bestCandidates(dp, cursor, level.coins).length === 0;

  return (
    <div
      className="vim-touchpad flex shrink-0 flex-col min-[960px]:hidden"
      aria-label="Touch controls"
    >
      <div className="vim-touchpad__row">
        {level.coins.map((coin) => (
          <TouchKey
            key={coin}
            label={`${coin}¢`}
            title={`forge via the ${coin}¢ coin`}
            onPress={() => handleKey(String(coin))}
          />
        ))}
        <TouchKey
          label="x"
          tone={mustStamp ? 'accent' : 'default'}
          title="stamp ∞ — no coin reaches this cell"
          onPress={() => handleKey('x')}
        />
      </div>
      <div className="vim-touchpad__row">
        <TouchKey label="r" tone="muted" title="restart level" onPress={() => handleKey('r')} />
      </div>
      <p className="vim-touchpad__hint">pick the coin with the cheapest past · x stamps ∞</p>
    </div>
  );
}
