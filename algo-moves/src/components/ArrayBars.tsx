export type BarTone = 'idle' | 'compare' | 'swap' | 'sorted' | 'pivot' | 'min' | 'done';

export interface ArrayBarsProps {
  values: number[];
  /** Per-index visual state → tints the bar. */
  tone?: (i: number) => BarTone;
  /** Caption under each bar (defaults to the index). */
  label?: (i: number) => string | number;
  height?: number;
  /** Override the value mapped to a full-height bar (keep stable across frames). */
  max?: number;
}

/**
 * Generic bar chart for array/sorting problems. One bar per element, height
 * proportional to the value, tinted by `tone`. Theme-safe (uses CSS vars).
 */
export function ArrayBars({ values, tone, label, height = 220, max }: ArrayBarsProps) {
  const hi = max ?? Math.max(1, ...values);
  return (
    <div className="bars" style={{ height }} role="img" aria-label="array bars">
      {values.map((v, i) => {
        const t = tone?.(i) ?? 'idle';
        return (
          <div key={i} className="bar-col">
            <div className={`bar bar-${t}`} style={{ height: `${Math.max(4, (v / hi) * 100)}%` }}>
              <span className="bar-val">{v}</span>
            </div>
            <span className="bar-idx">{label ? label(i) : i}</span>
          </div>
        );
      })}
    </div>
  );
}
