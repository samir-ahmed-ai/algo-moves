import { useContext } from 'react';
import type {
  WorkspaceAppearanceCtx,
  WorkspaceChromeCtx,
  WorkspaceCtx,
  WorkspaceNavigationCtx,
} from './workspaceContextTypes';
import {
  WorkspaceAppearanceContext,
  WorkspaceChromeContext,
  WorkspaceNavigationContext,
} from './workspaceContextStore';

const MISSING = 'useWorkspace hooks must be used inside <WorkspaceProvider>';

export function useWorkspaceAppearance(): WorkspaceAppearanceCtx {
  const ctx = useContext(WorkspaceAppearanceContext);
  if (!ctx) throw new Error(MISSING);
  return ctx;
}

export function useWorkspaceChrome(): WorkspaceChromeCtx {
  const ctx = useContext(WorkspaceChromeContext);
  if (!ctx) throw new Error(MISSING);
  return ctx;
}

export function useWorkspaceNavigation(): WorkspaceNavigationCtx {
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
