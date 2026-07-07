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

type WebAudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const audioWindow = window as WebAudioWindow;
    const Ctor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx || ctx.state === 'closed') ctx = new Ctor();
    return ctx;
  } catch {
    ctx = null;
    return null;
  }
}
