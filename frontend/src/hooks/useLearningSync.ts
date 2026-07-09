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
  // Whether the PREVIOUS resolved session was anonymous — decides migrate-vs-replace.
  const prevAnonRef = useRef<boolean>(true);

  useEffect(() => {
    if (loading) return;
    const signedIn = !!userId && !isAnonymous;
    if (!signedIn) {
      // Signing out of a real account: clear the singleton stores so the next user
      // (a guest or a different account on this shared browser) never inherits — and
      // never pushes up — the previous account's data.
      if (!prevAnonRef.current) {
        for (const engine of allSyncs()) engine.reset();
      }
      setSyncActive(false);
      hydratedForRef.current = null;
      prevAnonRef.current = true;
      return;
    }
    if (hydratedForRef.current === userId) return;
    // Merge local up only when arriving from a guest session (the anonymous→auth
    // migration). Any other sign-in (account switch, or a real account after another
    // real account) REPLACES local with the account's server state.
    const migrate = prevAnonRef.current;
    hydratedForRef.current = userId;
    prevAnonRef.current = false;

    let cancelled = false;
    void (async () => {
      const configured = await isArcadeConfigured();
      if (cancelled) return;
      setSyncActive(configured);
      if (!configured) return;
      for (const engine of allSyncs()) {
        await (migrate ? engine.hydrate() : engine.hydrateReplace());
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
