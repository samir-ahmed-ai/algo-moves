/**
 * Feature flags for Yjs canvas collaboration.
 *
 * Transport is ON when `VITE_HOCUSPOCUS_URL` is set. Subdoc transport defaults
 * ON with transport (opt-out with `VITE_YJS_SUBDOC_TRANSPORT=false`).
 *
 * Shadow flags remain opt-in for parity validation without cutting over.
 */
export type YjsCollabMode = 'off' | 'shadow' | 'transport';

export type YjsCollabStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

export function hocuspocusUrl(): string | undefined {
  const raw = import.meta.env.VITE_HOCUSPOCUS_URL;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

function envExplicitTrue(name: string): boolean {
  return import.meta.env[name] === 'true';
}

function envExplicitFalse(name: string): boolean {
  return import.meta.env[name] === 'false';
}

export function isYjsShadowEnabled(): boolean {
  return envExplicitTrue('VITE_YJS_SHADOW');
}

export function isYjsSubdocShadowEnabled(): boolean {
  return envExplicitTrue('VITE_YJS_SUBDOC_SHADOW');
}

export function isYjsTransportEnabled(): boolean {
  return !!hocuspocusUrl();
}

export function isYjsSubdocTransportEnabled(): boolean {
  if (!isYjsTransportEnabled()) return false;
  if (envExplicitFalse('VITE_YJS_SUBDOC_TRANSPORT')) return false;
  return true;
}

/** Whether granular canvas edit-ops should be bypassed in favour of Yjs. */
export function useYjsForCanvasGraph(): boolean {
  return isYjsTransportEnabled();
}

/** Whether subdoc patch ops should be bypassed in favour of Yjs. */
export function useYjsForSubdocs(): boolean {
  return isYjsSubdocTransportEnabled();
}

export function resolveYjsCollabMode(opts: {
  isCollaborating: boolean;
  isHost: boolean;
}): YjsCollabMode {
  if (!opts.isCollaborating) return 'off';
  if (isYjsTransportEnabled()) return 'transport';
  if (isYjsShadowEnabled() && opts.isHost) return 'shadow';
  return 'off';
}
