import { useCallback, useEffect, useRef, useState } from 'react';
import { browseBreadcrumbForItem, catalog, getTrackById, type TrackId } from '@/content';
import { normalizeCanvasMode, type CanvasMode } from '@/core';
import { parsePageFromPathname, writeAppUrl } from '@/lib/navigation/appRoute';
import { writeMobileHash, writeVimHash, writeDojoHash, writeGamesHash } from '@/lib/navigation';
import { initialBrowseFromHash } from '@/store/navigation/browseNavigation';
import { resolveShareItemId, type ShareState } from '@/store/navigation/shareState';
import { writeStorageText } from '@/store/persistence/storage';
import type { AppRoute } from './workspace';
import { LAST_ITEM_KEY } from './workspaceConstants';
import type { WorkspaceNavigationCtx } from './workspaceContextTypes';

type NavigationState = Omit<WorkspaceNavigationCtx, 'session'>;

function cleanRouteParam(value: string | undefined): string | undefined {
  const clean = typeof value === 'string' ? value.trim() : '';
  return clean || undefined;
}

function isCanvasFocus(shared: ShareState | null): boolean {
  return shared?.focus === 'canvas';
}

/** Whether the shared URL points at the interview-seeded standalone canvas. */
export function initialCanvasVariant(shared: ShareState | null): 'plain' | 'interview' {
  if (!isCanvasFocus(shared)) return 'plain';
  return shared?.variant === 'interview' || shared?.sessionKind === 'interview'
    ? 'interview'
    : 'plain';
}

/** Where Back should land when leaving a focused problem view. */
export function resolveBackToBrowseTarget(
  activeItemId: string,
  activeTrackId: TrackId | null,
  activeCategoryId: string | null,
): { trackId: TrackId | null; categoryId: string | null; fallback: 'home' | null } {
  if (activeCategoryId || activeTrackId) {
    return { trackId: activeTrackId, categoryId: activeCategoryId, fallback: null };
  }

  const crumb = browseBreadcrumbForItem(activeItemId, catalog);
  if (crumb.category?.id) {
    return {
      trackId: crumb.track?.id ? (crumb.track.id as TrackId) : null,
      categoryId: crumb.category.id,
      fallback: null,
    };
  }
  if (crumb.track?.id) {
    return { trackId: crumb.track.id as TrackId, categoryId: null, fallback: null };
  }
  return { trackId: null, categoryId: null, fallback: 'home' };
}

/** App route + active problem/browse selection + the enter-X navigators. */
export function useAppNavigation(shared: ShareState | null): NavigationState {
  const canvasFocus = isCanvasFocus(shared);
  const sharedItemId = resolveShareItemId(shared);
  const [mode, setMode] = useState<CanvasMode>(() =>
    canvasFocus ? 'visualize' : normalizeCanvasMode(shared?.mode),
  );
  const [activeItemId, setActiveItemId] = useState(sharedItemId ?? catalog.firstItemId);
  const initialBrowse = useRef(
    typeof location === 'undefined'
      ? { trackId: null, categoryId: null, topicId: null }
      : initialBrowseFromHash(location.hash, sharedItemId, location.pathname),
  ).current;
  const [activeTopicId, setActiveTopicId] = useState<string | null>(initialBrowse.topicId);
  const [activeTrackId, setActiveTrackId] = useState<TrackId | null>(() =>
    shared?.trackId && getTrackById(shared.trackId as TrackId)
      ? (shared.trackId as TrackId)
      : initialBrowse.trackId,
  );
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(initialBrowse.categoryId);
  const [problemFocused, setProblemFocused] = useState(() => {
    if (canvasFocus) return false;
    return !!sharedItemId;
  });
  const [canvasVariant, setCanvasVariant] = useState<'plain' | 'interview'>(() =>
    initialCanvasVariant(shared),
  );
  const [route, setRoute] = useState<AppRoute>(() => {
    if (canvasFocus) return 'workspace';
    if (sharedItemId) return 'workspace';
    if (shared?.trackId && getTrackById(shared.trackId as TrackId)) return 'workspace';
    if (typeof location !== 'undefined') {
      const page = parsePageFromPathname(location.pathname);
      if (page === 'mobile') return 'mobile';
      if (page === 'vim') return 'vim';
      if (page === 'dojo') return 'dojo';
      if (page === 'games') return 'games';
      if (page === 'plans') return 'plans';
      if (page === 'resumes') return 'resumes';
      if (page === 'profile') return 'profile';
      if (page === 'home') return 'home';
      if (page === 'workspace') return 'workspace';
      if (
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(max-width: 767px)').matches
      )
        return 'mobile';
    }
    return 'home';
  });

  const goHome = useCallback(() => {
    setActiveTrackId(null);
    setActiveCategoryId(null);
    setProblemFocused(false);
    setRoute('home');
    writeAppUrl('home');
  }, []);

  const openProblem = useCallback((id: string) => {
    const itemId = cleanRouteParam(id);
    if (!itemId) return;
    setActiveItemId(itemId);
    setActiveTopicId(null);
    setMode('learn');
    setProblemFocused(true);
    setRoute('workspace');
  }, []);

  const enterCanvas = useCallback(() => {
    setActiveTrackId(null);
    setActiveCategoryId(null);
    setActiveTopicId(null);
    setMode('visualize');
    setProblemFocused(false);
    setCanvasVariant('plain');
    setRoute('workspace');
  }, []);

  /** Open the freeform canvas pre-seeded with the interview board layout. */
  const enterCollabCanvas = useCallback(() => {
    setActiveTrackId(null);
    setActiveCategoryId(null);
    setActiveTopicId(null);
    setMode('visualize');
    setProblemFocused(false);
    setCanvasVariant('interview');
    setRoute('workspace');
  }, []);

  const backToBrowse = useCallback(() => {
    const target = resolveBackToBrowseTarget(activeItemId, activeTrackId, activeCategoryId);
    if (target.fallback === 'home') {
      goHome();
      return;
    }
    if (target.categoryId !== activeCategoryId) setActiveCategoryId(target.categoryId);
    if (target.trackId !== activeTrackId) setActiveTrackId(target.trackId);
    setProblemFocused(false);
  }, [activeItemId, activeTrackId, activeCategoryId, goHome]);

  const enterWorkspace = useCallback(
    (itemId?: string) => {
      if (itemId) openProblem(itemId);
      else {
        setRoute('workspace');
        writeAppUrl('workspace');
      }
    },
    [openProblem],
  );

  const enterProblemInMode = useCallback((id: string, problemMode: CanvasMode) => {
    const itemId = cleanRouteParam(id);
    if (!itemId) return;
    setActiveItemId(itemId);
    setActiveTopicId(null);
    setMode(problemMode);
    setProblemFocused(true);
    setRoute('workspace');
  }, []);

  const enterMobile = useCallback((categoryId?: string, itemId?: string) => {
    const cleanCategoryId = cleanRouteParam(categoryId);
    const cleanItemId = cleanRouteParam(itemId);
    setActiveCategoryId(cleanCategoryId ?? null);
    setActiveTopicId(cleanCategoryId ? `browse-${cleanCategoryId}` : null);
    setRoute('mobile');
    writeMobileHash(
      cleanCategoryId
        ? { categoryId: cleanCategoryId, ...(cleanItemId ? { itemId: cleanItemId } : {}) }
        : null,
    );
  }, []);

  const enterVim = useCallback((levelId?: string) => {
    setRoute('vim');
    // Guard against non-string args (e.g. a MouseEvent from onClick={enterVim}).
    writeVimHash(typeof levelId === 'string' && levelId ? { levelId } : null);
  }, []);

  const enterDojo = useCallback((gameId?: string, levelId?: string) => {
    setRoute('dojo');
    // Guard against non-string args (e.g. a MouseEvent from onClick={enterDojo}).
    const cleanGameId = cleanRouteParam(gameId);
    const cleanLevelId = cleanRouteParam(levelId);
    writeDojoHash(
      cleanGameId
        ? { gameId: cleanGameId, ...(cleanLevelId ? { levelId: cleanLevelId } : {}) }
        : null,
    );
  }, []);

  const enterGames = useCallback((roomCode?: string) => {
    const room = cleanRouteParam(roomCode);
    setRoute('games');
    writeGamesHash(room ? { room } : null);
  }, []);

  const enterPlans = useCallback(() => {
    setRoute('plans');
    writeAppUrl('plans');
  }, []);

  const enterResumes = useCallback(() => {
    setRoute('resumes');
    writeAppUrl('resumes');
  }, []);

  const enterProfile = useCallback(() => {
    setRoute('profile');
    writeAppUrl('profile');
  }, []);

  // Remember the last problem opened in the workspace for the home page's "Continue".
  useEffect(() => {
    if (route === 'workspace' && activeItemId) {
      writeStorageText(LAST_ITEM_KEY, activeItemId);
    }
  }, [route, activeItemId]);

  return {
    mode,
    setMode,
    activeItemId,
    setActiveItemId,
    activeTopicId,
    setActiveTopicId,
    activeTrackId,
    setActiveTrackId,
    activeCategoryId,
    setActiveCategoryId,
    problemFocused,
    setProblemFocused,
    canvasVariant,
    route,
    goHome,
    enterWorkspace,
    enterCanvas,
    enterCollabCanvas,
    enterProblemInMode,
    openProblem,
    backToBrowse,
    enterMobile,
    enterVim,
    enterDojo,
    enterGames,
    enterPlans,
    enterResumes,
    enterProfile,
  };
}
