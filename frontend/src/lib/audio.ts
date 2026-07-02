/**
 * Tiny Web-Audio sound engine for the games arcade. Synthesises short cues on
 * the fly (no asset files), mirroring the tone approach already used in
 * shell/Workspace.tsx. Muting is persisted, and playback is a safe no-op where
 * Web Audio is unavailable or the user has muted.
 *
 *   import { playCue } from '../../lib/audio';
 *   playCue('win');
 */
import { readStorageText, writeStorageText } from './storage';

const MUTE_KEY = 'algo-moves:games:muted';

export type SoundCue =
  | 'click'
  | 'select'
  | 'win'
  | 'lose'
  | 'draw'
  | 'countdown'
  | 'go'
  | 'join'
  | 'leave'
  | 'message'
  | 'reaction'
  | 'tick'
  | 'error';

interface Note {
  freq: number;
  /** start offset in seconds */
  at: number;
  /** duration in seconds */
  dur: number;
  type?: OscillatorType;
  gain?: number;
}

// Each cue is a tiny sequence of notes. Kept intentionally short and quiet.
const CUES: Record<SoundCue, Note[]> = {
  click: [{ freq: 440, at: 0, dur: 0.05, gain: 0.12 }],
  select: [{ freq: 620, at: 0, dur: 0.07, gain: 0.14 }],
  tick: [{ freq: 880, at: 0, dur: 0.03, gain: 0.08 }],
  countdown: [{ freq: 520, at: 0, dur: 0.12, gain: 0.16 }],
  go: [
    { freq: 720, at: 0, dur: 0.09, gain: 0.18 },
    { freq: 1040, at: 0.08, dur: 0.14, gain: 0.18 },
  ],
  win: [
    { freq: 660, at: 0, dur: 0.11, gain: 0.18 },
    { freq: 880, at: 0.1, dur: 0.11, gain: 0.18 },
    { freq: 1180, at: 0.2, dur: 0.2, gain: 0.2 },
  ],
  lose: [
    { freq: 340, at: 0, dur: 0.14, gain: 0.16 },
    { freq: 240, at: 0.13, dur: 0.24, gain: 0.16, type: 'sawtooth' },
  ],
  draw: [
    { freq: 480, at: 0, dur: 0.1, gain: 0.14 },
    { freq: 480, at: 0.12, dur: 0.14, gain: 0.14 },
  ],
  join: [
    { freq: 520, at: 0, dur: 0.08, gain: 0.14 },
    { freq: 780, at: 0.07, dur: 0.12, gain: 0.14 },
  ],
  leave: [
    { freq: 500, at: 0, dur: 0.09, gain: 0.12 },
    { freq: 320, at: 0.08, dur: 0.14, gain: 0.12 },
  ],
  message: [{ freq: 700, at: 0, dur: 0.06, gain: 0.1 }],
  reaction: [{ freq: 900, at: 0, dur: 0.05, gain: 0.12 }],
  error: [{ freq: 200, at: 0, dur: 0.18, gain: 0.16, type: 'square' }],
};

let ctx: AudioContext | null = null;
let muted = readStorageText(MUTE_KEY) === '1';
const listeners = new Set<(muted: boolean) => void>();

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx) ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

export function isSoundMuted(): boolean {
  return muted;
}

export function setSoundMuted(next: boolean): void {
  muted = next;
  writeStorageText(MUTE_KEY, next ? '1' : '0');
  listeners.forEach((fn) => fn(next));
}

export function toggleSoundMuted(): void {
  setSoundMuted(!muted);
}

/** Subscribe to mute changes (for a UI toggle). Returns an unsubscribe fn. */
export function subscribeSoundMuted(fn: (muted: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Play a named cue. No-op when muted or Web Audio is unavailable. */
export function playCue(cue: SoundCue): void {
  if (muted) return;
  const audio = audioContext();
  if (!audio) return;
  try {
    if (audio.state === 'suspended') void audio.resume();
    const now = audio.currentTime;
    for (const note of CUES[cue]) {
      const osc = audio.createOscillator();
      const gainNode = audio.createGain();
      osc.type = note.type ?? 'sine';
      osc.frequency.value = note.freq;
      const peak = note.gain ?? 0.15;
      const start = now + note.at;
      const end = start + note.dur;
      gainNode.gain.setValueAtTime(0.0001, start);
      gainNode.gain.exponentialRampToValueAtTime(peak, start + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gainNode).connect(audio.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    }
  } catch {
    // ignore audio failures
  }
}
