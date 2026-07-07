import type { TrackId } from '../../content';

/** Signature gradient stops per content course, reused as line accents/rails. */
interface TrackColor {
  c1: string;
  c2: string;
}

/**
 * Per-course colors for the course tree. Values reuse the original roadmap
 * palette so the visual identity carries over. The `interview-prep` aggregator
 * is intentionally omitted — it is not shown as a top-level course.
 */
const TRACK_COLORS: Record<Exclude<TrackId, 'interview-prep'>, TrackColor> = {
  'data-structures': { c1: '#21a7ff', c2: '#2f6bff' },
  algorithms: { c1: '#7c5cff', c2: '#b06bff' },
  design: { c1: '#16c79a', c2: '#0e9aa5' },
  go: { c1: '#ffb020', c2: '#ff7a1a' },
  openrtb: { c1: '#ff4d94', c2: '#7c3aed' },
};

const FALLBACK: TrackColor = { c1: '#21a7ff', c2: '#2f6bff' };

export function trackColor(id: TrackId): TrackColor {
  return (TRACK_COLORS as Record<string, TrackColor>)[id] ?? FALLBACK;
}
