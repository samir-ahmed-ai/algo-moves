import { useSyncExternalStore } from 'react';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import { isSoundMuted, subscribeSoundMuted, toggleSoundMuted } from '@/lib/utils/audio';

export type SoundMuteState = readonly [muted: boolean, toggleMuted: () => void];

/** True when the user asked the OS to reduce motion. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/** Live-bound sound mute state plus a toggle, backed by lib/audio. */
export function useSoundMuted(): SoundMuteState {
  const muted = useSyncExternalStore(subscribeSoundMuted, isSoundMuted, () => true);
  return [muted, toggleSoundMuted];
}
