import { WorkspaceProvider, useWorkspace } from '@/store/workspace';
import { ReplayStoreProvider } from '@/store/replay';
import { AuthProvider } from '@/shell/games/data/AuthProvider';
import { Workspace } from './shell/Workspace';
import { LandingPage } from './shell/home/LandingPage';
import { MobileApp } from './shell/mobile/MobileApp';
import { VimDojoPage } from './shell/vim/VimDojoPage';
import { GamesPage } from './shell/games/GamesPage';
import { ErrorBoundary } from './shell/ErrorBoundary';

function Shell() {
  const { route } = useWorkspace();
  if (route === 'mobile') return <MobileApp />;
  if (route === 'vim') return <VimDojoPage />;
  if (route === 'games') return <GamesPage />;
  return route === 'home' ? <LandingPage /> : <Workspace />;
}

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <ReplayStoreProvider>
          <div className="h-[100dvh] w-screen overflow-hidden bg-bg font-sans text-ink antialiased">
            <ErrorBoundary label="app">
              <Shell />
            </ErrorBoundary>
          </div>
        </ReplayStoreProvider>
      </WorkspaceProvider>
    </AuthProvider>
  );
}
