/**
 * Tiny Web-Audio sound engine for the games arcade. Synthesises short cues on
 * the fly (no asset files), mirroring the tone approach already used in
 * shell/Workspace.tsx. Playback is a safe no-op where Web Audio is unavailable
 * or the user has muted.
 *
 *   import { playCue } from '@/lib/utils/audio';
 *   playCue('win');
 *
 * This module stays pure (no store/persistence import — see docs/architecture.md
 * layering). The app wires mute persistence once at startup via
 * `configureSoundPersistence` (see shell/games/soundConfig.ts).
 */
import { getAudioContext } from './webAudio';

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

type Note = Readonly<{
  freq: number;
  /** start offset in seconds */
  at: number;
  /** duration in seconds */
  dur: number;
  type?: OscillatorType;
  gain?: number;
}>;

type SoundMutedListener = (muted: boolean) => void;
type SoundMutedSaver = (muted: boolean) => void;
type PlayableNote = Readonly<
  Required<Pick<Note, 'freq' | 'at' | 'dur' | 'gain'>> & Pick<Note, 'type'>
>;

const MIN_GAIN = 0.0001;
const DEFAULT_GAIN = 0.15;
const MAX_GAIN = 0.25;
const MIN_DURATION = 0.01;
const MAX_DURATION = 1;

// Each cue is a tiny sequence of notes. Kept intentionally short and quiet.
const CUES: Readonly<Record<SoundCue, readonly Note[]>> = {
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

let muted = false;
let persistMuted: SoundMutedSaver | null = null;
const listeners = new Set<SoundMutedListener>();

function normalizeNote(note: Note): PlayableNote | null {
  if (!Number.isFinite(note.freq) || !Number.isFinite(note.at) || !Number.isFinite(note.dur)) {
    return null;
  }
  return {
    freq: note.freq,
    at: Math.max(0, note.at),
    dur: Math.min(MAX_DURATION, Math.max(MIN_DURATION, note.dur)),
    gain: Math.min(MAX_GAIN, Math.max(MIN_GAIN, note.gain ?? DEFAULT_GAIN)),
    ...(note.type ? { type: note.type } : {}),
  };
}

function notifySoundMuted(value: boolean): void {
  listeners.forEach((listener) => listener(value));
}

/**
 * Wire mute persistence once at startup. Seeds the initial muted state and a
 * saver callback so this pure module never imports the store directly. Safe to
 * call more than once (last wins); until called, sound defaults to unmuted.
 */
export function configureSoundPersistence(initialMuted: boolean, save: SoundMutedSaver): void {
  muted = Boolean(initialMuted);
  persistMuted = save;
  notifySoundMuted(muted);
}

export function isSoundMuted(): boolean {
  return muted;
}

export function setSoundMuted(next: boolean): void {
  const value = Boolean(next);
  if (muted === value) return;
  muted = value;
  try {
    persistMuted?.(value);
  } catch {
    // persistence is best-effort
  }
  notifySoundMuted(value);
}

export function toggleSoundMuted(): void {
  setSoundMuted(!muted);
}

/** Subscribe to mute changes (for a UI toggle). Returns an unsubscribe fn. */
export function subscribeSoundMuted(fn: (muted: boolean) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Play a named cue. No-op when muted or Web Audio is unavailable. */
export function playCue(cue: SoundCue): void {
  if (muted) return;
  const notes = CUES[cue];
  if (!notes) return;
  const audio = getAudioContext();
  if (!audio) return;
  try {
    if (audio.state === 'suspended') void audio.resume();
    const now = audio.currentTime;
    for (const rawNote of notes) {
      const note = normalizeNote(rawNote);
      if (!note) continue;
      const osc = audio.createOscillator();
      const gainNode = audio.createGain();
      osc.type = note.type ?? 'sine';
      osc.frequency.value = note.freq;
      const start = now + note.at;
      const end = start + note.dur;
      gainNode.gain.setValueAtTime(MIN_GAIN, start);
      gainNode.gain.exponentialRampToValueAtTime(note.gain, start + MIN_DURATION);
      gainNode.gain.exponentialRampToValueAtTime(MIN_GAIN, end);
      osc.connect(gainNode).connect(audio.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    }
  } catch {
    // ignore audio failures
  }
}
