/**
 * Opt-in Hocuspocus provider hook for evaluating Yjs transport.
 *
 * Usage (spike only):
 * ```tsx
 * const { doc, status } = useYjsCanvasSpike({ roomId, wsUrl, enabled: false });
 * ```
 *
 * Production still uses host-authoritative relay in CanvasCollabProvider.
 */
import { HocuspocusProvider } from '@hocuspocus/provider';
import { useEffect, useState } from 'react';
import * as Y from 'yjs';

export type YjsSpikeStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

export interface UseYjsCanvasSpikeOptions {
  roomId: string;
  /** Self-hosted Hocuspocus WebSocket URL, e.g. ws://localhost:1234 */
  wsUrl: string;
  enabled?: boolean;
  /** Called when the provider syncs remote state into the local Y.Doc. */
  onSynced?: (doc: Y.Doc) => void;
}

export interface UseYjsCanvasSpikeResult {
  doc: Y.Doc;
  status: YjsSpikeStatus;
  provider: HocuspocusProvider | null;
}

export function useYjsCanvasSpike({
  roomId,
  wsUrl,
  enabled = false,
  onSynced,
}: UseYjsCanvasSpikeOptions): UseYjsCanvasSpikeResult {
  const [doc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [status, setStatus] = useState<YjsSpikeStatus>('idle');

  useEffect(() => {
    if (!enabled || !roomId || !wsUrl) {
      setProvider(null);
      setStatus('idle');
      return;
    }

    setStatus('connecting');
    const next = new HocuspocusProvider({
      url: wsUrl,
      name: roomId,
      document: doc,
      onSynced: () => {
        setStatus('connected');
        onSynced?.(doc);
      },
      onClose: () => setStatus('disconnected'),
      onDisconnect: () => setStatus('disconnected'),
    });

    setProvider(next);
    return () => {
      next.destroy();
      setProvider(null);
      setStatus('idle');
    };
  }, [doc, enabled, onSynced, roomId, wsUrl]);

  return { doc, status, provider };
}
