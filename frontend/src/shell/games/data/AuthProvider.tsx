import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getSupabase, isSupabaseConfigured } from './supabaseClient';
import { getProfile, updateProfile } from './db';
import type { Profile } from './types';

export interface AuthApi {
  /** Whether Supabase is wired up at all. When false, everything below is inert. */
  configured: boolean;
  loading: boolean;
  userId: string | null;
  profile: Profile | null;
  isAnonymous: boolean;
  /** Sign in anonymously if not already signed in. Safe to call repeatedly. */
  ensureSignedIn: () => Promise<string | null>;
  updateMyProfile: (patch: Partial<Pick<Profile, 'display_name' | 'avatar_seed'>>) => Promise<void>;
  /** Upgrade an anonymous account by attaching an email (magic-link confirm). */
  linkEmail: (email: string) => Promise<{ error?: string }>;
  /** Upgrade / sign in via an OAuth provider. */
  linkOAuth: (provider: 'google' | 'github') => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const noop = async () => {};

const AuthContext = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const signingIn = useRef<Promise<string | null> | null>(null);

  const loadProfile = useCallback(async (id: string | null) => {
    if (!id) {
      setProfile(null);
      return;
    }
    setProfile(await getProfile(id));
  }, []);

  // Track the existing session (if any) and keep it fresh. We do NOT auto
  // sign-in on mount — anonymous sign-in happens on the first play action so
  // idle browsers don't create throwaway accounts.
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let alive = true;

    sb.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      const user = data.session?.user ?? null;
      setUserId(user?.id ?? null);
      setIsAnonymous(user?.is_anonymous ?? true);
      await loadProfile(user?.id ?? null);
      setLoading(false);
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setUserId(user?.id ?? null);
      setIsAnonymous(user?.is_anonymous ?? true);
      void loadProfile(user?.id ?? null);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const ensureSignedIn = useCallback(async (): Promise<string | null> => {
    const sb = getSupabase();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    if (data.session?.user) return data.session.user.id;
    if (signingIn.current) return signingIn.current;

    signingIn.current = (async () => {
      const { data: signed, error } = await sb.auth.signInAnonymously();
      signingIn.current = null;
      if (error || !signed.user) return null;
      setUserId(signed.user.id);
      setIsAnonymous(true);
      await loadProfile(signed.user.id);
      return signed.user.id;
    })();
    return signingIn.current;
  }, [loadProfile]);

  const updateMyProfile = useCallback<AuthApi['updateMyProfile']>(
    async (patch) => {
      const id = userId ?? (await ensureSignedIn());
      if (!id) return;
      const next = await updateProfile(id, patch);
      if (next) setProfile(next);
    },
    [userId, ensureSignedIn],
  );

  const linkEmail = useCallback<AuthApi['linkEmail']>(async (email) => {
    const sb = getSupabase();
    if (!sb) return { error: 'not-configured' };
    const { error } = await sb.auth.updateUser({ email });
    return error ? { error: error.message } : {};
  }, []);

  const linkOAuth = useCallback<AuthApi['linkOAuth']>(async (provider) => {
    const sb = getSupabase();
    if (!sb) return { error: 'not-configured' };
    const redirectTo = typeof location === 'undefined' ? undefined : location.href;
    // linkIdentity upgrades an anonymous user in place; fall back to a normal
    // OAuth sign-in if manual linking isn't enabled.
    const { error } = isAnonymous
      ? await sb.auth.linkIdentity({ provider, options: { redirectTo } })
      : await sb.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error && isAnonymous) {
      const fallback = await sb.auth.signInWithOAuth({ provider, options: { redirectTo } });
      return fallback.error ? { error: fallback.error.message } : {};
    }
    return error ? { error: error.message } : {};
  }, [isAnonymous]);

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    await sb.auth.signOut();
    setUserId(null);
    setProfile(null);
    setIsAnonymous(true);
  }, []);

  const refreshProfile = useCallback(() => loadProfile(userId), [loadProfile, userId]);

  const value: AuthApi = configured
    ? {
        configured,
        loading,
        userId,
        profile,
        isAnonymous,
        ensureSignedIn,
        updateMyProfile,
        linkEmail,
        linkOAuth,
        signOut,
        refreshProfile,
      }
    : {
        configured: false,
        loading: false,
        userId: null,
        profile: null,
        isAnonymous: true,
        ensureSignedIn: async () => null,
        updateMyProfile: noop,
        linkEmail: async () => ({ error: 'not-configured' }),
        linkOAuth: async () => ({ error: 'not-configured' }),
        signOut: noop,
        refreshProfile: noop,
      };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
