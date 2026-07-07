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
import { ProfilePage } from './shell/profile/ProfilePage';
import { SettingsDialog } from '@/shell/canvas';
import { useUserSettingsSync } from '@/shell/settings/useUserSettingsSync';

const ROUTE_LABELS = {
  home: 'Algo Moves landing page',
  mobile: 'Mobile swipe practice',
  vim: 'Vim dojo',
  dojo: 'Practice dojo',
  games: 'Algorithm games',
  plans: 'Study plans',
  resumes: 'Resume workspace',
  profile: 'Your profile',
  canvas: 'Algorithm canvas workspace',
} as const;

function Shell() {
  const { route } = useWorkspace();
  if (route === 'mobile') return <MobileApp />;
  if (route === 'vim') return <VimDojoPage />;
  if (route === 'dojo') return <DojoHubPage />;
  if (route === 'games') return <GamesPage />;
  if (route === 'plans') return <PlansPage />;
  if (route === 'resumes') return <ResumesPage />;
  if (route === 'profile') return <ProfilePage />;
  return route === 'home' ? <LandingPage /> : <Workspace />;
}

function AppFrame() {
  const { route } = useWorkspace();
  const routeLabel = ROUTE_LABELS[route as keyof typeof ROUTE_LABELS] ?? 'Algorithm workspace';
  useUserSettingsSync();

  return (
    <div className="h-[100dvh] min-h-[100dvh] w-screen overflow-hidden bg-bg font-sans text-ink antialiased">
      <ErrorBoundary label="app">
        <main aria-label={routeLabel} className="h-full min-w-0" data-route={route}>
          <Shell />
        </main>
        <SettingsDialog />
      </ErrorBoundary>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <PlanProvider>
          <ReplayStoreProvider>
            <AppFrame />
          </ReplayStoreProvider>
        </PlanProvider>
      </WorkspaceProvider>
    </AuthProvider>
  );
}
