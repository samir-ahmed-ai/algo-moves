import { cn } from '@/lib/utils/cn';
import { useScheduleGame } from '../ScheduleGameProvider';

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
  const { complete, level, booked, hints, hintIndices, handleKey } = useScheduleGame();
  if (complete) return null;

  const digits = level.meetings.map((meeting, i) => ({ meeting, i }));
  const rows = digits.length > 5 ? [digits.slice(0, 5), digits.slice(5)] : [digits];

  return (
    <div
      className="vim-touchpad flex shrink-0 flex-col min-[960px]:hidden"
      aria-label="Touch controls"
    >
      {rows.map((row, r) => (
        <div key={r} className="vim-touchpad__row">
          {row.map(({ meeting, i }) => (
            <TouchKey
              key={i}
              label={String(i + 1)}
              tone={booked.includes(i) ? 'muted' : hintIndices.includes(i) ? 'accent' : 'default'}
              title={`book ${meeting.name}`}
              onPress={() => handleKey(String(i + 1))}
            />
          ))}
        </div>
      ))}
      <div className="vim-touchpad__row">
        <TouchKey
          label="?"
          tone={hints ? 'accent' : 'default'}
          title="toggle hints"
          onPress={() => handleKey('?')}
        />
        <TouchKey label="r" tone="muted" title="restart level" onPress={() => handleKey('r')} />
      </div>
      <p className="vim-touchpad__hint">book the compatible meeting that ends earliest</p>
    </div>
  );
}
