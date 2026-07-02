import { useSyncExternalStore } from 'react';
import { useMediaQuery } from '../../../lib/useMediaQuery';
import { isSoundMuted, subscribeSoundMuted, toggleSoundMuted } from '../../../lib/audio';

/** True when the user asked the OS to reduce motion. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/** Live-bound sound mute state plus a toggle, backed by lib/audio. */
export function useSoundMuted(): [boolean, () => void] {
  const muted = useSyncExternalStore(subscribeSoundMuted, isSoundMuted, () => true);
  return [muted, toggleSoundMuted];
}
