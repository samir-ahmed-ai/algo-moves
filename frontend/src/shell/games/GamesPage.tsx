import { useWorkspace } from '@/store/workspace';
import { GamesLocaleProvider } from './locale';
import { GameRoomProvider } from './net/useGameRoom';
import { ToastProvider } from './ui/Toast';
import { ensureSoundConfig } from './soundConfig';
import { ArcadeView } from './arcade/ArcadeView';

export function GamesPage() {
  ensureSoundConfig();
  const { density } = useWorkspace();
  return (
    <GameRoomProvider>
      <GamesLocaleProvider>
        <ToastProvider>
          <div
            data-density={density}
            className="ws-scroll flex h-full w-full flex-col overflow-y-auto bg-bg text-ink [padding-bottom:env(safe-area-inset-bottom)]"
          >
            <ArcadeView />
          </div>
        </ToastProvider>
      </GamesLocaleProvider>
    </GameRoomProvider>
  );
}
