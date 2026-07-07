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
  arcadeAuthRequest,
  arcadeFetch,
  clearSessionToken,
  getSessionToken,
  isArcadeConfigured,
  setPersonalRoomCode,
  setSessionToken,
  getProfile,
  updateProfile,
  type Profile,
} from '@/platform';

export interface AuthApi {
  configured: boolean;
  loading: boolean;
  userId: string | null;
  profile: Profile | null;
  isAnonymous: boolean;
  ensureSignedIn: () => Promise<string | null>;
  updateMyProfile: (patch: Partial<Pick<Profile, 'display_name' | 'avatar_seed'>>) => Promise<void>;
  signUpEmail: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<{ error?: string }>;
  signInEmail: (email: string, password: string) => Promise<{ error?: string }>;
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

function syncPersonalRoom(profile: Profile | null | undefined): void {
  if (profile?.personal_room_code) setPersonalRoomCode(profile.personal_room_code);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const signingIn = useRef<Promise<string | null> | null>(null);

  const applySession = useCallback((sess: GuestSession) => {
    setSessionToken(sess.session_token);
    setUserId(sess.profile_id);
    setIsAnonymous(sess.profile.is_anonymous);
    setProfile(sess.profile);
    syncPersonalRoom(sess.profile);
  }, []);

  const refreshFromServer = useCallback(async () => {
    const me = await arcadeFetch<Profile>('/api/auth/me');
    if (!me) return;
    setUserId(me.id);
    setIsAnonymous(me.is_anonymous);
    setProfile(me);
    syncPersonalRoom(me);
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
      const me = await arcadeFetch<Profile>('/api/auth/me');
      if (!alive) return;
      if (me) {
        setUserId(me.id);
        setIsAnonymous(me.is_anonymous);
        setProfile(me);
        syncPersonalRoom(me);
      } else if (getSessionToken()) {
        clearSessionToken();
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
        syncPersonalRoom(me);
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
      applySession(sess);
      return sess.profile_id;
    })();
    return signingIn.current;
  }, [configured, userId, applySession]);

  const signUpEmail = useCallback<AuthApi['signUpEmail']>(
    async (email, password, displayName) => {
      if (!configured) return { error: 'not-configured' };
      const res = await arcadeAuthRequest<GuestSession>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, display_name: displayName }),
      });
      if (!res.ok) return { error: res.error };
      applySession(res.data);
      return {};
    },
    [configured, applySession],
  );

  const signInEmail = useCallback<AuthApi['signInEmail']>(
    async (email, password) => {
      if (!configured) return { error: 'not-configured' };
      const res = await arcadeAuthRequest<GuestSession>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return { error: res.error };
      applySession(res.data);
      return {};
    },
    [configured, applySession],
  );

  const updateMyProfile = useCallback<AuthApi['updateMyProfile']>(
    async (patch) => {
      const id = userId ?? (await ensureSignedIn());
      if (!id) return;
      const next = await updateProfile(id, patch);
      if (next) setProfile(next);
    },
    [userId, ensureSignedIn],
  );

  const signOut = useCallback(async () => {
    await arcadeFetch('/api/auth/logout', { method: 'POST' });
    clearSessionToken();
    setUserId(null);
    setProfile(null);
    setIsAnonymous(true);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    const next = await getProfile(userId);
    if (next) setProfile(next);
    else await refreshFromServer();
  }, [userId, refreshFromServer]);

  const value: AuthApi = {
    configured,
    loading,
    userId: configured ? userId : null,
    profile: configured ? profile : null,
    isAnonymous: configured ? isAnonymous : true,
    ensureSignedIn: configured ? ensureSignedIn : async () => null,
    updateMyProfile: configured ? updateMyProfile : noop,
    signUpEmail: configured ? signUpEmail : async () => ({ error: 'not-configured' }),
    signInEmail: configured ? signInEmail : async () => ({ error: 'not-configured' }),
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
