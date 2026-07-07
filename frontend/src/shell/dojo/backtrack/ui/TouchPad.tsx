import { cn } from '@/lib/utils/cn';
import { useBacktrackGame } from '../BacktrackGameProvider';

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
  const { complete, deadEnd, handleKey } = useBacktrackGame();
  if (complete) return null;

  return (
    <div
      className="vim-touchpad flex shrink-0 flex-col min-[960px]:hidden"
      aria-label="Touch controls"
    >
      <div className="vim-touchpad__row">
        <TouchKey label="h" title="move left" onPress={() => handleKey('h')} />
        <TouchKey label="♛" tone="accent" title="place queen" onPress={() => handleKey('j')} />
        <TouchKey label="l" title="move right" onPress={() => handleKey('l')} />
        <TouchKey
          label="u"
          tone={deadEnd ? 'accent' : 'default'}
          title="backtrack — undo last queen"
          onPress={() => handleKey('u')}
        />
      </div>
      <div className="vim-touchpad__row">
        <TouchKey
          label="Esc"
          tone="muted"
          title="reset level"
          onPress={() => handleKey('Escape')}
        />
        <TouchKey label="r" tone="muted" title="restart level" onPress={() => handleKey('r')} />
        <TouchKey label="?" tone="muted" title="toggle hints" onPress={() => handleKey('?')} />
      </div>
    </div>
  );
}
