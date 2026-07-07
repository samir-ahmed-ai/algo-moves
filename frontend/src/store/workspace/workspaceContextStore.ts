import { createContext } from 'react';
import type {
  WorkspaceAppearanceCtx,
  WorkspaceChromeCtx,
  WorkspaceNavigationCtx,
} from './workspaceContextTypes';

export const WorkspaceAppearanceContext = createContext<WorkspaceAppearanceCtx | null>(null);
export const WorkspaceChromeContext = createContext<WorkspaceChromeCtx | null>(null);
export const WorkspaceNavigationContext = createContext<WorkspaceNavigationCtx | null>(null);

/** @deprecated Prefer slice contexts; kept for backward compatibility. */
export const WorkspaceContext = WorkspaceAppearanceContext;
