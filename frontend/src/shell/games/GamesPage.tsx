import { useEffect } from 'react';
import { useWorkspace } from '@/store/workspace';
import { GamesLocaleProvider } from './locale';
import { GameRoomProvider } from './net/useGameRoom';
import { ToastProvider } from './ui/Toast';
import { ensureSoundConfig } from './soundConfig';
import { ArcadeView } from './arcade/ArcadeView';

export function GamesPage() {
  const { density } = useWorkspace();

  useEffect(() => {
    ensureSoundConfig();
  }, []);

  return (
    <GameRoomProvider>
      <GamesLocaleProvider>
        <ToastProvider>
          <div
            data-density={density}
            data-surface="games"
            className="ws-scroll relative isolate flex h-full w-full flex-col overflow-y-auto bg-bg text-ink [padding-bottom:env(safe-area-inset-bottom)]"
            aria-label="Algorithm games arcade"
          >
            <div
              aria-hidden
              className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,color-mix(in_srgb,var(--accent)_22%,transparent),transparent_28rem),radial-gradient(circle_at_86%_16%,rgba(248,214,121,0.12),transparent_24rem)]"
            />
            <ArcadeView />
          </div>
        </ToastProvider>
      </GamesLocaleProvider>
    </GameRoomProvider>
  );
}
