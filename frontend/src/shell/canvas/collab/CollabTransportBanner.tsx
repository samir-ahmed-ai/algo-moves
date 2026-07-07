import { useState } from 'react';
import { SoloFallbackBanner } from './SoloFallbackBanner';

/** Shown when a collab session runs on the legacy edit-op relay (no Hocuspocus URL). */
export function CollabTransportBanner({ active }: { active: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  if (!active || dismissed) return null;
  return (
    <SoloFallbackBanner
      message="Canvas sync is using the legacy relay — set VITE_HOCUSPOCUS_URL or run make dev-collab for Yjs transport."
      onDismiss={() => setDismissed(true)}
    />
  );
}
