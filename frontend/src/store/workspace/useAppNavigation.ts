import { useCallback, useEffect, useRef, useState } from 'react';
import { catalog, type TrackId } from '@/content';
import { normalizeCanvasMode, type CanvasMode } from '@/core';
import {
  isMobileHash,
  writeMobileHash,
  isVimHash,
  writeVimHash,
  isGamesHash,
  writeGamesHash,
} from '@/lib/navigation';
import { initialBrowseFromHash } from '@/store/navigation/browseNavigation';
import { writeStorageText } from '@/store/persistence/storage';
import type { ShareState } from '@/store/navigation/shareState';
import type { AppRoute } from './workspace';
import { LAST_ITEM_KEY } from './workspaceConstants';

/** App route + active problem/browse selection + the enter-X navigators. */
export function useAppNavigation(shared: ShareState | null) {
  const [mode, setMode] = useState<CanvasMode>(() => normalizeCanvasMode(shared?.mode));
  const [activeItemId, setActiveItemId] = useState(
    shared?.item && catalog.getItem(shared.item) ? shared.item : catalog.firstItemId,
  );
  const initialBrowse = useRef(
    typeof location === 'undefined'
      ? { trackId: null, categoryId: null, topicId: null }
      : initialBrowseFromHash(location.hash, shared?.item),
  ).current;
  const [activeTopicId, setActiveTopicId] = useState<string | null>(initialBrowse.topicId);
  const [activeTrackId, setActiveTrackId] = useState<TrackId | null>(initialBrowse.trackId);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(initialBrowse.categoryId);
  const [route, setRoute] = useState<AppRoute>(() => {
    if (shared?.item && catalog.getItem(shared.item)) return 'workspace';
    if (typeof location !== 'undefined') {
      const hash = location.hash;
      if (isMobileHash(hash)) return 'mobile';
      if (isVimHash(hash)) return 'vim';
      if (isGamesHash(hash)) return 'games';
      if (hash === '#home') return 'home';
      if (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 767px)').matches) return 'mobile';
    }
    return 'home';
  });

  const goHome = useCallback(() => {
    setRoute('home');
    if (typeof location !== 'undefined') {
      history.replaceState(null, '', `${location.pathname}${location.search}#home`);
    }
  }, []);

  const openProblem = useCallback((id: string) => {
    setActiveItemId(id);
    setActiveTopicId(null);
    setActiveTrackId(null);
    setActiveCategoryId(null);
    setRoute('workspace');
  }, []);

  const enterWorkspace = useCallback(
    (itemId?: string) => {
      if (itemId) openProblem(itemId);
      else setRoute('workspace');
    },
    [openProblem],
  );

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
    route,
    goHome,
    enterWorkspace,
    openProblem,
    enterMobile,
    enterVim,
    enterGames,
  };
}
