import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  arcadeFetch,
  clearSessionToken,
  getSessionToken,
  isArcadeConfigured,
  setSessionToken,
} from './arcadeClient';
import { getProfile, updateProfile } from './db';
import type { Profile } from './types';

export interface AuthApi {
  /** Whether Postgres arcade persistence is wired up on the game server. */
  configured: boolean;
  loading: boolean;
  userId: string | null;
  profile: Profile | null;
  isAnonymous: boolean;
  /** Sign in as a guest if not already signed in. Safe to call repeatedly. */
  ensureSignedIn: () => Promise<string | null>;
  updateMyProfile: (patch: Partial<Pick<Profile, 'display_name' | 'avatar_seed'>>) => Promise<void>;
  /** Upgrade an anonymous account by attaching an email (not available without OAuth provider). */
  linkEmail: (email: string) => Promise<{ error?: string }>;
  /** Upgrade / sign in via an OAuth provider (not available without OAuth provider). */
  linkOAuth: (provider: 'google' | 'github') => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const noop = async () => {};

const AuthContext = createContext<AuthApi | null>(null);

type GuestSession = {
  profile_id: string;
  session_token: string;
  profile: Profile;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    let alive = true;
    (async () => {
      const ok = await isArcadeConfigured();
      if (!alive) return;
      setConfigured(ok);
      if (!ok) {
        setLoading(false);
        return;
      }
      const token = getSessionToken();
      if (token) {
        const me = await arcadeFetch<Profile>('/api/auth/me');
        if (!alive) return;
        if (me) {
          setUserId(me.id);
          setIsAnonymous(me.is_anonymous);
          setProfile(me);
        } else {
          clearSessionToken();
        }
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const ensureSignedIn = useCallback(async (): Promise<string | null> => {
    if (!configured) return null;
    if (userId) return userId;
    const token = getSessionToken();
    if (token) {
      const me = await arcadeFetch<Profile>('/api/auth/me');
      if (me) {
        setUserId(me.id);
        setIsAnonymous(me.is_anonymous);
        setProfile(me);
        return me.id;
      }
      clearSessionToken();
    }
    if (signingIn.current) return signingIn.current;

    signingIn.current = (async () => {
      const sess = await arcadeFetch<GuestSession>('/api/auth/guest', {
        method: 'POST',
        auth: false,
      });
      signingIn.current = null;
      if (!sess) return null;
      setSessionToken(sess.session_token);
      setUserId(sess.profile_id);
      setIsAnonymous(true);
      setProfile(sess.profile);
      return sess.profile_id;
    })();
    return signingIn.current;
  }, [configured, userId]);

  const updateMyProfile = useCallback<AuthApi['updateMyProfile']>(
    async (patch) => {
      const id = userId ?? (await ensureSignedIn());
      if (!id) return;
      const next = await updateProfile(id, patch);
      if (next) setProfile(next);
    },
    [userId, ensureSignedIn],
  );

  const linkEmail = useCallback<AuthApi['linkEmail']>(async () => {
    if (!configured) return { error: 'not-configured' };
    return { error: 'not-available' };
  }, [configured]);

  const linkOAuth = useCallback<AuthApi['linkOAuth']>(async () => {
    if (!configured) return { error: 'not-configured' };
    return { error: 'not-available' };
  }, [configured]);

  const signOut = useCallback(async () => {
    clearSessionToken();
    setUserId(null);
    setProfile(null);
    setIsAnonymous(true);
  }, []);

  const refreshProfile = useCallback(() => loadProfile(userId), [loadProfile, userId]);

  const value: AuthApi = {
    configured,
    loading,
    userId: configured ? userId : null,
    profile: configured ? profile : null,
    isAnonymous: configured ? isAnonymous : true,
    ensureSignedIn: configured ? ensureSignedIn : async () => null,
    updateMyProfile: configured ? updateMyProfile : noop,
    linkEmail: configured ? linkEmail : async () => ({ error: 'not-configured' }),
    linkOAuth: configured ? linkOAuth : async () => ({ error: 'not-configured' }),
    signOut: configured ? signOut : noop,
    refreshProfile: configured ? refreshProfile : noop,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
