import { TONE_BAR, type UiTone } from '@/design/tone';

/** Animated progress bar. */
export function Meter({
  value,
  max = 1,
  tone = 'good',
  height = 6,
}: {
  value: number;
  max?: number;
  tone?: UiTone;
  height?: number;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) * 100 : 0;
  return (
    <div className="w-full overflow-hidden rounded-full bg-panel2" style={{ height }}>
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%`, background: TONE_BAR[tone] }}
      />
    </div>
  );
}
