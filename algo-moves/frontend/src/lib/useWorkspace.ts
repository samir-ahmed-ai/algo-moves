import { useContext } from 'react';
import { WorkspaceContext } from './workspaceContextStore';

export function useWorkspace() {
  const c = useContext(WorkspaceContext);
  if (!c) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return c;
}
