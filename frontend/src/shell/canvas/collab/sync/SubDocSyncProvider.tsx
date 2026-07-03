import { createContext, useContext, type ReactNode } from 'react';
import { useSubDocSync, type SubDocSyncResult } from './useSubDocSync';
import type { SubDocKind } from './subdocProtocol';

const SubDocSyncContext = createContext<SubDocSyncResult | null>(null);

export function SubDocSyncProvider({ kind, children }: { kind: SubDocKind; children: ReactNode }) {
  const sync = useSubDocSync(kind);
  return <SubDocSyncContext.Provider value={sync}>{children}</SubDocSyncContext.Provider>;
}

export function useSubDocSyncContext(): SubDocSyncResult {
  const ctx = useContext(SubDocSyncContext);
  if (!ctx) throw new Error('useSubDocSyncContext must be used within a SubDocSyncProvider');
  return ctx;
}
