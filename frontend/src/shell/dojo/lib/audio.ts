import { readStorageJson } from '@/store/persistence/storage';
import { createSyncStore } from '@/store/createSyncStore';
import { STORAGE_KEYS } from '@/store/storageKeys';

/**
 * Tiny WebAudio synth for dojo games: short pentatonic blips on actions,
 * an arpeggio on success. All calls are safe no-ops when audio is muted,
 * unavailable, or blocked — never throw from a keypress handler.
 */

const muteStore = createSyncStore<boolean>(STORAGE_KEYS.DOJO_MUTED, () =>
  readStorageJson(STORAGE_KEYS.DOJO_MUTED, false),
);

export function isDojoMuted(): boolean {
  return muteStore.get();
}

export function setDojoMuted(muted: boolean) {
  muteStore.set(muted);
}

export function useDojoMuted(): boolean {
  return muteStore.use();
}

let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx;
}

/** C-major pentatonic across two octaves — any step sequence sounds musical. */
const PENTATONIC_HZ = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];

function blip(freq: number, at: number, duration: number, gainPeak: number, type: OscillatorType) {
  const ac = audioCtx();
  if (!ac) return;
  try {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const t0 = ac.currentTime + at;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(gainPeak, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  } catch {
    // audio is best-effort
  }
}

/** Play the pentatonic note for a step index (wraps past the scale). */
export function playDojoTone(step: number, opts?: { duration?: number }) {
  if (muteStore.get()) return;
  const freq =
    PENTATONIC_HZ[((step % PENTATONIC_HZ.length) + PENTATONIC_HZ.length) % PENTATONIC_HZ.length]!;
  blip(freq, 0, opts?.duration ?? 0.22, 0.08, 'triangle');
}

/** Replay a melody of step indices, evenly spaced. */
export function playDojoMelody(steps: number[], noteGapSeconds = 0.16) {
  if (muteStore.get()) return;
  steps.forEach((step, i) => {
    const freq =
      PENTATONIC_HZ[((step % PENTATONIC_HZ.length) + PENTATONIC_HZ.length) % PENTATONIC_HZ.length]!;
    blip(freq, i * noteGapSeconds, 0.2, 0.07, 'triangle');
  });
}

/** Rising arpeggio for level completion. */
export function playDojoSuccess() {
  if (muteStore.get()) return;
  [0, 2, 4, 7].forEach((step, i) => blip(PENTATONIC_HZ[step]!, i * 0.09, 0.28, 0.07, 'triangle'));
}

/** Soft low thud for an invalid action. */
export function playDojoError() {
  if (muteStore.get()) return;
  blip(110, 0, 0.16, 0.06, 'square');
}
