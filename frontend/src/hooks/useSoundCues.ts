import { useEffect } from 'react';
import type { Frame } from '@/core/types';
import { getAudioContext } from '@/lib/utils/webAudio';

/** #121 Plays a short tone on each new frame, pitched by the move's tone. */
export function useSoundCues(enabled: boolean, frame: Frame | undefined) {
  const moveTone = frame?.move.tone;
  const moveType = frame?.move.type;
  useEffect(() => {
    if (!enabled || !moveType) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = moveTone === 'good' ? 660 : moveTone === 'bad' ? 220 : 440;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.start(t);
      osc.stop(t + 0.13);
    } catch {
      // Web Audio unavailable — ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveType, moveTone, frame, enabled]);
}
