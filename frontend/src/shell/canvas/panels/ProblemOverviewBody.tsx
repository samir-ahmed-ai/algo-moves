import { useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import { isEditableTarget } from '@/lib/utils/keyboard';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import { useCanvasFrame } from '../CanvasContext';
import { ProblemPanelBody } from './ProblemPanelBody';
import { VizPanelBody } from './VizPanelBody';
import { TransportBar } from '../TransportBarCore';

/** Learn Overview tab — problem statement beside the live animation board. */
export function ProblemOverviewBody() {
  const isMobile = useIsMobile();
  const { player } = useCanvasFrame();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          player.next();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          player.prev();
          break;
        case ' ':
          e.preventDefault();
          player.togglePlay();
          break;
        case 'Home':
          e.preventDefault();
          player.goTo(0);
          break;
        case 'End':
          e.preventDefault();
          player.goTo(player.total - 1);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [player.next, player.prev, player.togglePlay, player.goTo, player.total]);

  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 overflow-hidden',
        isMobile ? 'flex-col' : 'flex-row',
      )}
    >
      <aside
        className={cn(
          'ws-scroll shrink-0 overflow-y-auto border-edge bg-panel/40',
          isMobile ? 'max-h-[40vh] border-b' : 'w-[min(380px,38vw)] border-r',
        )}
      >
        <div className="p-3 sm:p-4">
          <div className="rounded-[var(--radius)] border border-edge bg-panel p-3 sm:p-4">
            <ProblemPanelBody />
          </div>
        </div>
      </aside>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="ws-scroll min-h-0 flex-1 overflow-auto">
          <VizPanelBody />
        </div>
        <div className="flex shrink-0 justify-center border-t border-edge bg-panel/80 px-3 py-2 backdrop-blur">
          <TransportBar />
        </div>
      </main>
    </div>
  );
}
