import { useCallback, useEffect, useRef, useState } from 'react';
import { catalog, getTrackById, type TrackId } from '@/content';
import { normalizeCanvasMode, type CanvasMode } from '@/core';
import { normalizeLegacyUrl, parsePageFromPathname, writeAppUrl } from '@/lib/navigation/appRoute';
import {
  isMobileHash,
  writeMobileHash,
  isVimHash,
  writeVimHash,
  isGamesHash,
  writeGamesHash,
} from '@/lib/navigation';
import { initialBrowseFromHash } from '@/store/navigation/browseNavigation';
import { resolveShareItemId, type ShareState } from '@/store/navigation/shareState';
import { writeStorageText } from '@/store/persistence/storage';
import type { AppRoute } from './workspace';
import { LAST_ITEM_KEY } from './workspaceConstants';

function isCanvasFocus(shared: ShareState | null): boolean {
  if (!shared) return false;
  if (shared.focus === 'canvas') return true;
  // Legacy share links: mode=visualize without an item meant canvas-only.
  return shared.mode === 'visualize' && !shared.item;
}

/** App route + active problem/browse selection + the enter-X navigators. */
export function useAppNavigation(shared: ShareState | null) {
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
  const [activeTrackId, setActiveTrackId] = useState<TrackId | null>(
    () => (shared?.trackId && getTrackById(shared.trackId as TrackId)) ? (shared.trackId as TrackId) : initialBrowse.trackId,
  );
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(initialBrowse.categoryId);
  const [problemFocused, setProblemFocused] = useState(() => {
    if (canvasFocus) return false;
    return !!sharedItemId;
  });
  const [route, setRoute] = useState<AppRoute>(() => {
    if (canvasFocus) return 'workspace';
    if (sharedItemId) return 'workspace';
    if (shared?.trackId && getTrackById(shared.trackId as TrackId)) return 'workspace';
    if (typeof location !== 'undefined') {
      normalizeLegacyUrl();
      const page = parsePageFromPathname(location.pathname);
      if (page === 'mobile') return 'mobile';
      if (page === 'vim') return 'vim';
      if (page === 'games') return 'games';
      if (page === 'plans') return 'plans';
      if (page === 'home') return 'home';
      if (page === 'workspace') return 'workspace';
      const { hash, pathname } = location;
      if (isMobileHash(hash, pathname)) return 'mobile';
      if (isVimHash(hash, pathname)) return 'vim';
      if (isGamesHash(hash, pathname)) return 'games';
      if (hash === '#home') return 'home';
      if (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 767px)').matches) return 'mobile';
    }
    return 'home';
  });

  const goHome = useCallback(() => {
    setRoute('home');
    writeAppUrl('home');
  }, []);

  const openProblem = useCallback((id: string) => {
    setActiveItemId(id);
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
    setRoute('workspace');
  }, []);

  /** Alias for {@link enterCanvas} — freeform collab surface. */
  const enterCollabCanvas = enterCanvas;

  const backToBrowse = useCallback(() => {
    setProblemFocused(false);
  }, []);

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
    setActiveItemId(id);
    setActiveTopicId(null);
    setMode(problemMode);
    setProblemFocused(true);
    setRoute('workspace');
  }, []);

  const enterMobile = useCallback((categoryId?: string, itemId?: string) => {
    setActiveCategoryId(categoryId ?? null);
    setActiveTopicId(categoryId ? `browse-${categoryId}` : null);
    setRoute('mobile');
    writeMobileHash(categoryId ? { categoryId, itemId } : null);
  }, []);

  const enterVim = useCallback((levelId?: string) => {
    setRoute('vim');
    writeVimHash(levelId ? { levelId } : null);
  }, []);

  const enterGames = useCallback((roomCode?: string) => {
    setRoute('games');
    writeGamesHash(roomCode ? { room: roomCode } : null);
  }, []);

  const enterPlans = useCallback(() => {
    setRoute('plans');
    writeAppUrl('plans');
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
    enterGames,
    enterPlans,
  };
}
