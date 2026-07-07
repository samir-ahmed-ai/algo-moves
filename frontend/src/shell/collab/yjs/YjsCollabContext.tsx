import { createContext, useContext, type ReactNode } from 'react';
import * as Y from 'yjs';
import type { CanvasDoc } from '../protocol/collabProtocol';
import type { SubDocSnapshot } from '../protocol/subdocProtocol';
import type { CanvasGraph } from './yjsCanvasBinding';
import type { YjsCollabMode, YjsCollabStatus } from './yjsConfig';

export interface YjsCollabApi {
  doc: Y.Doc | null;
  mode: YjsCollabMode;
  status: YjsCollabStatus;
  /** Shadow mode: replace Yjs state from host snapshots. */
  mirrorSnapshots: (canvas: CanvasDoc, subDocs?: Record<string, SubDocSnapshot>) => void;
  /** Transport mode: incremental graph write. */
  writeGraph: (graph: CanvasGraph) => void;
}

const defaultApi: YjsCollabApi = {
  doc: null,
  mode: 'off',
  status: 'idle',
  mirrorSnapshots: () => {},
  writeGraph: () => {},
};

const YjsCollabContext = createContext<YjsCollabApi>(defaultApi);

export function YjsCollabProvider({
  value,
  children,
}: {
  value: YjsCollabApi;
  children: ReactNode;
}) {
  return <YjsCollabContext.Provider value={value}>{children}</YjsCollabContext.Provider>;
}

export function useYjsCollab(): YjsCollabApi {
  return useContext(YjsCollabContext);
}
