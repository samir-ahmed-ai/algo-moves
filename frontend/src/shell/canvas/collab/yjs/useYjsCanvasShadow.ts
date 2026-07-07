/**
 * Phase A Yjs shadow mode — dual-write host snapshots into a local Y.Doc.
 *
 * Enable with `VITE_YJS_SHADOW=true`. Optionally sync to Hocuspocus when
 * `VITE_HOCUSPOCUS_URL` is set (e.g. `ws://localhost:1234`).
 */
import { HocuspocusProvider } from '@hocuspocus/provider';
import { useCallback, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import type { CanvasDoc } from '../protocol/collabProtocol';
import { seedYjsCanvasDoc } from './yjsCanvasDoc';

export function isYjsShadowEnabled(): boolean {
  return import.meta.env.VITE_YJS_SHADOW === 'true';
}

export function hocuspocusUrl(): string | undefined {
  const raw = import.meta.env.VITE_HOCUSPOCUS_URL;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

export interface UseYjsCanvasShadowOptions {
  roomId: string | null;
  /** Host + collaborating session. */
  enabled: boolean;
}

export interface UseYjsCanvasShadowResult {
  /** Mirror a host-authoritative snapshot into the shadow Y.Doc. */
  mirrorShadow: (doc: CanvasDoc) => void;
  shadowDoc: Y.Doc | null;
}

export function useYjsCanvasShadow({
  roomId,
  enabled,
}: UseYjsCanvasShadowOptions): UseYjsCanvasShadowResult {
  const docRef = useRef<Y.Doc | null>(null);
  const mirrorRef = useRef<(doc: CanvasDoc) => void>(() => {});

  useEffect(() => {
    if (!enabled || !roomId || !isYjsShadowEnabled()) {
      docRef.current = null;
      mirrorRef.current = () => {};
      return;
    }

    const doc = new Y.Doc();
    docRef.current = doc;
    mirrorRef.current = (snapshot) => seedYjsCanvasDoc(doc, snapshot);

    const wsUrl = hocuspocusUrl();
    const provider = wsUrl
      ? new HocuspocusProvider({ url: wsUrl, name: roomId, document: doc })
      : null;

    return () => {
      provider?.destroy();
      doc.destroy();
      docRef.current = null;
      mirrorRef.current = () => {};
    };
  }, [enabled, roomId]);

  const mirrorShadow = useCallback((snapshot: CanvasDoc) => {
    mirrorRef.current(snapshot);
  }, []);

  return { mirrorShadow, shadowDoc: docRef.current };
}
