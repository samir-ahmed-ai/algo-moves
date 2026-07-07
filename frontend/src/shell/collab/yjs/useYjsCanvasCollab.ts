/**
 * Unified Yjs collab hook — shadow dual-write (Phase A/B) or transport (Phase D).
 * Hocuspocus provider is lazy-loaded so solo canvas sessions avoid the collab chunk.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import type { CanvasDoc } from '../protocol/collabProtocol';
import type { SubDocSnapshot } from '../protocol/subdocProtocol';
import { writeCanvasGraph, type CanvasGraph } from './yjsCanvasBinding';
import {
  hocuspocusUrl,
  isYjsSubdocShadowEnabled,
  resolveYjsCollabMode,
  type YjsCollabMode,
  type YjsCollabStatus,
} from './yjsConfig';
import { seedYjsCanvasDoc } from './yjsCanvasDoc';
import { seedYjsSubdocs } from './yjsSubdocBinding';

export interface UseYjsCanvasCollabOptions {
  roomId: string | null;
  isCollaborating: boolean;
  isHost: boolean;
}

export interface UseYjsCanvasCollabResult {
  doc: Y.Doc | null;
  mode: YjsCollabMode;
  status: YjsCollabStatus;
  mirrorSnapshots: (canvas: CanvasDoc, subDocs?: Record<string, SubDocSnapshot>) => void;
  writeGraph: (graph: CanvasGraph) => void;
}

export function useYjsCanvasCollab({
  roomId,
  isCollaborating,
  isHost,
}: UseYjsCanvasCollabOptions): UseYjsCanvasCollabResult {
  const mode = resolveYjsCollabMode({ isCollaborating, isHost });
  const docRef = useRef<Y.Doc | null>(null);
  const mirrorRef = useRef<(canvas: CanvasDoc, subDocs?: Record<string, SubDocSnapshot>) => void>(
    () => {},
  );
  const writeRef = useRef<(graph: CanvasGraph) => void>(() => {});
  const [status, setStatus] = useState<YjsCollabStatus>('idle');
  const [docState, setDocState] = useState<Y.Doc | null>(null);

  useEffect(() => {
    if (mode === 'off' || !roomId) {
      docRef.current = null;
      mirrorRef.current = () => {};
      writeRef.current = () => {};
      setDocState(null);
      setStatus('idle');
      return;
    }

    let cancelled = false;
    let provider: HocuspocusProvider | null = null;
    const doc = new Y.Doc();
    docRef.current = doc;
    setDocState(doc);
    setStatus('connecting');

    mirrorRef.current = (canvas, subDocs) => {
      seedYjsCanvasDoc(doc, canvas);
      if (isYjsSubdocShadowEnabled() && subDocs) seedYjsSubdocs(doc, subDocs);
    };

    writeRef.current = (graph) => {
      writeCanvasGraph(doc, graph);
    };

    const wsUrl = hocuspocusUrl();
    if (wsUrl) {
      void import('@hocuspocus/provider').then(({ HocuspocusProvider: Provider }) => {
        if (cancelled) return;
        provider = new Provider({
          url: wsUrl,
          name: roomId,
          document: doc,
          onSynced: () => {
            if (!cancelled) setStatus('connected');
          },
          onClose: () => {
            if (!cancelled) setStatus('disconnected');
          },
          onDisconnect: () => {
            if (!cancelled) setStatus('disconnected');
          },
        });
      });
    } else {
      setStatus('idle');
    }

    return () => {
      cancelled = true;
      provider?.destroy();
      doc.destroy();
      docRef.current = null;
      setDocState(null);
      mirrorRef.current = () => {};
      writeRef.current = () => {};
      setStatus('idle');
    };
  }, [mode, roomId]);

  const mirrorSnapshots = useCallback(
    (canvas: CanvasDoc, subDocs?: Record<string, SubDocSnapshot>) => {
      mirrorRef.current(canvas, subDocs);
    },
    [],
  );

  const writeGraph = useCallback((graph: CanvasGraph) => {
    writeRef.current(graph);
  }, []);

  return { doc: docState, mode, status, mirrorSnapshots, writeGraph };
}
