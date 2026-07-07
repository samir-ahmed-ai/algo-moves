import { useContext } from 'react';
import type { WorkspaceCtx } from './workspaceContextTypes';
import {
  WorkspaceAppearanceContext,
  WorkspaceChromeContext,
  WorkspaceNavigationContext,
} from './workspaceContextStore';

const MISSING = 'useWorkspace hooks must be used inside <WorkspaceProvider>';

export function useWorkspaceAppearance() {
  const ctx = useContext(WorkspaceAppearanceContext);
  if (!ctx) throw new Error(MISSING);
  return ctx;
}

export function useWorkspaceChrome() {
  const ctx = useContext(WorkspaceChromeContext);
  if (!ctx) throw new Error(MISSING);
  return ctx;
}

export function useWorkspaceNavigation() {
  const ctx = useContext(WorkspaceNavigationContext);
  if (!ctx) throw new Error(MISSING);
  return ctx;
}

/** Aggregates all slices — prefer slice hooks for narrower subscriptions. */
export function useWorkspace(): WorkspaceCtx {
  return {
    ...useWorkspaceAppearance(),
    ...useWorkspaceChrome(),
    ...useWorkspaceNavigation(),
  };
}
