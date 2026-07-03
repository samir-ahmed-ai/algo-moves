/**
 * Shared, lazily-created Web Audio context with the Safari `webkitAudioContext`
 * fallback. One AudioContext per document is the recommended pattern, so every
 * in-app sound source (games cues in utils/audio, per-frame tones in
 * useSoundCues) draws from this single instance.
 *
 * Returns null where Web Audio is unavailable (SSR, older browsers, or a
 * construction failure), so callers can no-op safely.
 */
let ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx) ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}
