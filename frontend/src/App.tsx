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
import { LearnDashboard } from './shell/learn';
import { SettingsDialog } from '@/shell/canvas';
import { useUserSettingsSync } from '@/shell/settings/useUserSettingsSync';
import { useLearningSync } from '@/hooks';
import { GlobalSearchHost } from '@/shell/search';

const ROUTE_LABELS = {
  home: 'Algo Moves landing page',
  mobile: 'Mobile swipe practice',
  vim: 'Vim dojo',
  dojo: 'Practice dojo',
  games: 'Algorithm games',
  learn: 'My Learning',
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
  if (route === 'learn') return <LearnDashboard />;
  if (route === 'plans') return <PlansPage />;
  if (route === 'resumes') return <ResumesPage />;
  if (route === 'profile') return <ProfilePage />;
  return route === 'home' ? <LandingPage /> : <Workspace />;
}

function AppFrame() {
  const { route } = useWorkspace();
  const routeLabel = ROUTE_LABELS[route as keyof typeof ROUTE_LABELS] ?? 'Algorithm workspace';
  useUserSettingsSync();
  useLearningSync();

  return (
    <div className="h-[100dvh] min-h-[100dvh] w-screen overflow-hidden bg-bg font-sans text-ink antialiased">
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-[100] rounded-full bg-accent px-4 py-2 text-sm font-semibold text-bg shadow-theme-md focus:not-sr-only"
      >
        Skip to content
      </a>
      <ErrorBoundary label="app">
        <main
          id="main-content"
          tabIndex={-1}
          aria-label={routeLabel}
          className="h-full min-h-0 min-w-0 outline-none"
          data-route={route}
        >
          <Shell />
        </main>
        <SettingsDialog />
        <GlobalSearchHost />
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
