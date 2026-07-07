import type { Tone } from '../../../core/types';

/**
 * One pill style for the frame-type chip everywhere it appears
 * (VizStatusBar, Transport) so the same move never renders in two
 * slightly different tones inches apart.
 */
export function moveToneChipClass(tone: Tone | undefined): string {
  if (tone === 'good') {
    return 'frame-tone-chip frame-tone-chip--good text-good border-good/50 bg-goodbg/30';
  }
  if (tone === 'bad') {
    return 'frame-tone-chip frame-tone-chip--bad text-bad border-bad/50 bg-badbg/30';
  }
  return 'frame-tone-chip frame-tone-chip--neutral text-ink3 border-edge/60 bg-panel2/70';
}
