import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('yjsConfig', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_HOCUSPOCUS_URL', '');
    vi.stubEnv('VITE_YJS_TRANSPORT', '');
    vi.stubEnv('VITE_YJS_SUBDOC_TRANSPORT', '');
    vi.stubEnv('VITE_YJS_SHADOW', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('disables transport without a Hocuspocus URL', async () => {
    const { isYjsTransportEnabled, useYjsForCanvasGraph } = await import('./yjsConfig');
    expect(isYjsTransportEnabled()).toBe(false);
    expect(useYjsForCanvasGraph()).toBe(false);
  });

  it('enables transport by default when URL is set', async () => {
    vi.stubEnv('VITE_HOCUSPOCUS_URL', 'ws://localhost:1234');
    const { isYjsTransportEnabled, isYjsSubdocTransportEnabled } = await import('./yjsConfig');
    expect(isYjsTransportEnabled()).toBe(true);
    expect(isYjsSubdocTransportEnabled()).toBe(true);
  });

  it('allows opt-out of transport with VITE_YJS_TRANSPORT=false', async () => {
    vi.stubEnv('VITE_HOCUSPOCUS_URL', 'ws://localhost:1234');
    vi.stubEnv('VITE_YJS_TRANSPORT', 'false');
    const { isYjsTransportEnabled } = await import('./yjsConfig');
    expect(isYjsTransportEnabled()).toBe(false);
  });

  it('does not enable transport without a Hocuspocus URL', async () => {
    vi.stubEnv('VITE_YJS_TRANSPORT', 'true');
    const { isYjsTransportEnabled } = await import('./yjsConfig');
    expect(isYjsTransportEnabled()).toBe(false);
  });

  it('resolves transport mode when collaborating', async () => {
    vi.stubEnv('VITE_HOCUSPOCUS_URL', 'wss://hp.example');
    const { resolveYjsCollabMode } = await import('./yjsConfig');
    expect(resolveYjsCollabMode({ isCollaborating: true, isHost: false })).toBe('transport');
    expect(resolveYjsCollabMode({ isCollaborating: false, isHost: true })).toBe('off');
  });

  it('falls back to shadow mode when transport is off', async () => {
    vi.stubEnv('VITE_YJS_SHADOW', 'true');
    const { resolveYjsCollabMode } = await import('./yjsConfig');
    expect(resolveYjsCollabMode({ isCollaborating: true, isHost: true })).toBe('shadow');
    expect(resolveYjsCollabMode({ isCollaborating: true, isHost: false })).toBe('off');
  });
});
