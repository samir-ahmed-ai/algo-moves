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
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(value, safeMax)) : 0;
  const safeHeight = Number.isFinite(height) ? Math.max(2, height) : 6;
  const pct = (safeValue / safeMax) * 100;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={safeValue}
      className="design-meter w-full overflow-hidden rounded-full bg-panel2"
      style={{ height: safeHeight }}
    >
      <div
        className={`design-meter__bar design-meter__bar--${tone} h-full rounded-full transition-[width] duration-500 ease-out`}
        style={{ width: `${pct}%`, background: TONE_BAR[tone] }}
      />
    </div>
  );
}
