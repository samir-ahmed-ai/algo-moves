import type { Tone } from '../../../core/types';

/**
 * One pill style for the frame-type chip everywhere it appears
 * (VizStatusBar, Transport) so the same move never renders in two
 * slightly different tones inches apart.
 */
export function moveToneChipClass(tone: Tone | undefined): string {
  if (tone === 'good') return 'text-good border-good/50 bg-goodbg/30';
  if (tone === 'bad') return 'text-bad border-bad/50 bg-badbg/30';
  return 'text-ink3 border-edge/60 bg-panel2/70';
}
