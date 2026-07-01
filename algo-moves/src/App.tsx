import { WorkspaceProvider, useWorkspace } from './lib/workspace';
import { ReplayStoreProvider } from './store/replayStore';
import { Workspace } from './shell/Workspace';
import { LandingPage } from './shell/home/LandingPage';
import { MobileApp } from './shell/mobile/MobileApp';
import { VimDojoPage } from './shell/vim/VimDojoPage';
import { ErrorBoundary } from './shell/ErrorBoundary';

function Shell() {
  const { route } = useWorkspace();
  if (route === 'mobile') return <MobileApp />;
  if (route === 'vim') return <VimDojoPage />;
  return route === 'home' ? <LandingPage /> : <Workspace />;
}

export default function App() {
  return (
    <WorkspaceProvider>
      <ReplayStoreProvider>
        <div className="h-[100dvh] w-screen overflow-hidden bg-bg font-sans text-ink antialiased">
          <ErrorBoundary label="app">
            <Shell />
          </ErrorBoundary>
        </div>
      </ReplayStoreProvider>
    </WorkspaceProvider>
  );
}
