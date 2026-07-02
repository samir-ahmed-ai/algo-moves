import { createContext } from 'react';
import type { WorkspaceCtx } from './workspaceContextTypes';

export const WorkspaceContext = createContext<WorkspaceCtx | null>(null);
