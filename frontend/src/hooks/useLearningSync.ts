import { useEffect, useRef } from 'react';
import { useAuth } from '@/shell/auth';
import { isArcadeConfigured } from '@/platform';
import { allSyncs, setSyncActive } from '@/store/persistence/sync';

/**
 * Drives offline-first server sync for the learner-state stores (progress, SRS, …).
 * Mirrors useUserSettingsSync: runs once per signed-in userId, hydrating each
 * registered sync engine (pull → merge → apply → converge-push). For guests /
 * signed-out / no-backend it deactivates sync so every store stays purely local.
 *
 * The guest→account transition (isAnonymous true→false, or userId change) re-runs
 * hydrate, which merges the guest's local progress up into the account — the
 * anonymous→auth migration, for free, because the merge is monotonic/LWW.
 *
 * Must be called inside <AuthProvider>.
 */
export function useLearningSync(): void {
  const { userId, isAnonymous, loading } = useAuth();
  const hydratedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    const signedIn = !!userId && !isAnonymous;
    if (!signedIn) {
      setSyncActive(false);
      hydratedForRef.current = null;
      return;
    }
    if (hydratedForRef.current === userId) return;
    hydratedForRef.current = userId;

    let cancelled = false;
    void (async () => {
      const configured = await isArcadeConfigured();
      if (cancelled) return;
      setSyncActive(configured);
      if (!configured) return;
      for (const engine of allSyncs()) {
        await engine.hydrate();
        if (cancelled) return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, isAnonymous, userId]);

  // Flush any pending debounced push on tab hide / unload so an in-flight edit is
  // not lost.
  useEffect(() => {
    const flushAll = (): void => {
      for (const engine of allSyncs()) engine.flush();
    };
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') flushAll();
    };
    window.addEventListener('pagehide', flushAll);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flushAll);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
}
