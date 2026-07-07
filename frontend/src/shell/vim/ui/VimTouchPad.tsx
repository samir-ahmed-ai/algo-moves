import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { MOTION_HELP, type VimMotionKind } from '../engine';
import { useVimGame } from '../canvas/VimGameProvider';

function gridChars(grid: string[]): string[] {
  const chars = new Set<string>();
  for (const row of grid) {
    for (const ch of row) {
      if (ch !== '#' && ch !== '.' && ch !== '@') chars.add(ch);
    }
  }
  return [...chars].sort();
}

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

export function VimTouchPad() {
  const { level, inputMachine, complete, newKeys, handleKey, recordKeyPress } = useVimGame();

  const chars = useMemo(() => gridChars(level.grid), [level.grid]);
  const pendingFind = inputMachine.pending && inputMachine.pending !== 'g';

  const press = (key: string, label = key) => {
    recordKeyPress(label);
    handleKey(key);
  };

  if (complete) return null;

  const motionTone = (kind: VimMotionKind) => (newKeys.includes(kind) ? 'accent' : 'default');

  return (
    <div
      className="vim-touchpad flex shrink-0 flex-col min-[960px]:hidden"
      aria-label="Touch controls"
    >
      {pendingFind ? (
        <div className="vim-touchpad__row">
          <span className="vim-touchpad__hint">
            {inputMachine.pending} + character on this line:
          </span>
          {chars.map((ch) => (
            <TouchKey key={ch} label={ch} tone="accent" onPress={() => press(ch)} />
          ))}
          <TouchKey
            label="Esc"
            tone="muted"
            title="cancel"
            onPress={() => press('Escape', 'Esc')}
          />
        </div>
      ) : (
        <>
          <div className="vim-touchpad__row">
            {level.allowed.map((kind) =>
              kind === 'nG' ? null : (
                <TouchKey
                  key={kind}
                  label={kind}
                  tone={motionTone(kind)}
                  title={MOTION_HELP[kind]}
                  onPress={() => press(kind)}
                />
              ),
            )}
          </div>
          <div className="vim-touchpad__row">
            {level.allowed.includes('nG')
              ? ['1', '2', '3', '4', '5'].map((d) => (
                  <TouchKey
                    key={d}
                    label={d}
                    title={`count / line ${d}`}
                    onPress={() => press(d)}
                  />
                ))
              : null}
            <TouchKey
              label="Esc"
              tone="muted"
              title="reset position"
              onPress={() => press('Escape', 'Esc')}
            />
            <TouchKey label="r" tone="muted" title="retry level" onPress={() => press('r')} />
            <TouchKey label="?" tone="muted" title="toggle hint" onPress={() => press('?')} />
          </div>
        </>
      )}
    </div>
  );
}
