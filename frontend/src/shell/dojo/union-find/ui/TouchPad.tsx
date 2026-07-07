import { cn } from '@/lib/utils/cn';
import { levelHasOpType } from '../engine/dsu';
import { useBridgeGame } from '../BridgeGameProvider';

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
  const { level, op, complete, handleKey } = useBridgeGame();
  if (complete) return null;

  const hasConnected = levelHasOpType(level, 'connected');
  const hasUnion = levelHasOpType(level, 'union');
  const hasEdge = levelHasOpType(level, 'edge');

  const hint =
    op?.type === 'connected'
      ? 'same root? y — different roots? n'
      : op?.type === 'union'
        ? "press the winning root — the larger tree's"
        : op?.type === 'edge'
          ? 'u builds the bridge · c skips a cycle'
          : '';

  return (
    <div
      className="vim-touchpad flex shrink-0 flex-col min-[960px]:hidden"
      aria-label="Touch controls"
    >
      {hasUnion ? (
        <div className="vim-touchpad__row">
          {level.islands.map((island) => (
            <TouchKey
              key={island.key}
              label={island.key}
              title={`island ${island.label}`}
              tone={op?.type === 'union' ? 'accent' : 'default'}
              onPress={() => handleKey(island.key)}
            />
          ))}
        </div>
      ) : null}
      <div className="vim-touchpad__row">
        {hasConnected ? (
          <>
            <TouchKey
              label="y"
              title="yes — same root"
              tone={op?.type === 'connected' ? 'accent' : 'default'}
              onPress={() => handleKey('y')}
            />
            <TouchKey
              label="n"
              title="no — different roots"
              tone={op?.type === 'connected' ? 'accent' : 'default'}
              onPress={() => handleKey('n')}
            />
          </>
        ) : null}
        {hasEdge ? (
          <>
            <TouchKey
              label="u"
              title="build — union by size"
              tone={op?.type === 'edge' ? 'accent' : 'default'}
              onPress={() => handleKey('u')}
            />
            <TouchKey
              label="c"
              title="cycle — skip it"
              tone={op?.type === 'edge' ? 'accent' : 'default'}
              onPress={() => handleKey('c')}
            />
          </>
        ) : null}
        <TouchKey label="r" tone="muted" title="restart level" onPress={() => handleKey('r')} />
      </div>
      <p className="vim-touchpad__hint">{hint}</p>
    </div>
  );
}
