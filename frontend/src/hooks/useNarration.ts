import { useEffect } from 'react';

/** Speaks the current caption via the Web Speech API when narration is enabled. */
export function useNarration(narrate: boolean, caption: string | undefined) {
  useEffect(() => {
    if (!narrate || !caption || typeof window === 'undefined' || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(caption);
    u.rate = 1.05;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, [caption, narrate]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
}
