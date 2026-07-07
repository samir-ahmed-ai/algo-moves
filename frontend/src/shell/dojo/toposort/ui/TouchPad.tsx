import { cn } from '@/lib/utils/cn';
import { useTopoGame } from '../TopoGameProvider';

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
  const { level, readySet, stuck, complete, handleKey } = useTopoGame();
  if (complete) return null;

  return (
    <div
      className="vim-touchpad flex shrink-0 flex-col min-[960px]:hidden"
      aria-label="Touch controls"
    >
      <div className="vim-touchpad__row">
        {level.nodes.map((node, i) => (
          <TouchKey
            key={node.key}
            label={node.key}
            tone={readySet.has(i) ? 'accent' : 'default'}
            title={node.label}
            onPress={() => handleKey(node.key)}
          />
        ))}
      </div>
      <div className="vim-touchpad__row">
        {level.cyclic ? (
          <TouchKey
            label="c"
            tone={stuck ? 'accent' : 'default'}
            title="call the cycle"
            onPress={() => handleKey('c')}
          />
        ) : null}
        <TouchKey
          label="Esc"
          tone="muted"
          title="reset level"
          onPress={() => handleKey('Escape')}
        />
        <TouchKey label="r" tone="muted" title="restart level" onPress={() => handleKey('r')} />
        <TouchKey label="?" tone="muted" title="toggle hint" onPress={() => handleKey('?')} />
      </div>
    </div>
  );
}
