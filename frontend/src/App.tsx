import { WorkspaceProvider, useWorkspace } from '@/store/workspace';
import { ReplayStoreProvider } from '@/store/replay';
import { AuthProvider } from '@/shell/auth';
import { Workspace } from './shell/Workspace';
import { LandingPage } from './shell/home/LandingPage';
import { MobileApp } from './shell/mobile/MobileApp';
import { VimDojoPage } from './shell/vim/VimDojoPage';
import { DojoHubPage } from './shell/dojo/DojoHubPage';
import { GamesPage } from '@/shell/games';
import { ErrorBoundary } from './shell/ErrorBoundary';
import { PlanProvider } from './shell/plans/PlanContext';
import { PlansPage } from './shell/plans/PlansPage';
import { ResumesPage } from './shell/resumes/ResumesPage';
import { SettingsDialog } from '@/shell/canvas';

function Shell() {
  const { route } = useWorkspace();
  if (route === 'mobile') return <MobileApp />;
  if (route === 'vim') return <VimDojoPage />;
  if (route === 'dojo') return <DojoHubPage />;
  if (route === 'games') return <GamesPage />;
  if (route === 'plans') return <PlansPage />;
  if (route === 'resumes') return <ResumesPage />;
  return route === 'home' ? <LandingPage /> : <Workspace />;
}

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <PlanProvider>
          <ReplayStoreProvider>
            <div className="h-[100dvh] w-screen overflow-hidden bg-bg font-sans text-ink antialiased">
              <ErrorBoundary label="app">
                <Shell />
                <SettingsDialog />
              </ErrorBoundary>
            </div>
          </ReplayStoreProvider>
        </PlanProvider>
      </WorkspaceProvider>
    </AuthProvider>
  );
}
