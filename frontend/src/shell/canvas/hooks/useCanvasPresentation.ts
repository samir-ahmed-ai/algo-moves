import { useEffect, useRef, type RefObject } from 'react';
import { useWorkspace } from '@/store/workspace';

/**
 * Sync presentation mode with the browser Fullscreen API on the canvas host.
 * Falls back gracefully when fullscreen is unavailable (e.g. iOS Safari).
 */
export function useCanvasPresentation(hostRef: RefObject<HTMLElement | null>) {
  const { present, setPresent, mode } = useWorkspace();
  const wasPresentRef = useRef(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || mode !== 'visualize') return;

    const doc = document as Document & { webkitFullscreenElement?: Element | null };
    const enter = host.requestFullscreen?.bind(host);
    const exit = document.exitFullscreen?.bind(document);

    if (present && !wasPresentRef.current) {
      wasPresentRef.current = true;
      void enter?.().catch(() => {});
    } else if (!present && wasPresentRef.current) {
      wasPresentRef.current = false;
      if (doc.fullscreenElement === host || doc.webkitFullscreenElement === host) {
        void exit?.().catch(() => {});
      }
    }
  }, [present, mode, hostRef]);

  useEffect(() => {
    const onChange = () => {
      const host = hostRef.current;
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      const fs = doc.fullscreenElement ?? doc.webkitFullscreenElement;
      if (!fs && present && host) setPresent(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, [present, setPresent, hostRef]);
}
