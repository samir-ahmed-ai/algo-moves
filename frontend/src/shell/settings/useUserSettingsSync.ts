import { useEffect, useRef } from 'react';
import { useAuth } from '@/shell/auth';
import { useWorkspaceAppearance } from '@/store/workspace/useWorkspace';
import {
  getUserSettings,
  putUserSettings,
  DEFAULT_USER_SETTINGS,
  type UserSettings,
} from '@/platform';
import { normalizeThemePreset } from '@/styles/themes/registry';
import { normalizeLayoutPreset } from '@/lib/canvas/layoutPrefs';
import { normalizeDensity } from '@/store/workspace';

/**
 * Hydrates workspace appearance state from server-persisted user settings on
 * sign-in and exposes `saveUserSettings` to persist current appearance state
 * back to the server.
 *
 * Must be called inside both <AuthProvider> and <WorkspaceProvider>.
 */
export function useUserSettingsSync() {
  const { userId, isAnonymous, loading } = useAuth();
  const { setTheme, setPalette, setDensity, setThemePreset, setLayoutPreset, tweaks, toggleTweak } =
    useWorkspaceAppearance();

  // Track which userId we last hydrated so we re-hydrate on account switch
  const hydratedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (isAnonymous || !userId) {
      hydratedForRef.current = null;
      return;
    }
    if (hydratedForRef.current === userId) return;
    hydratedForRef.current = userId;

    (async () => {
      const settings = await getUserSettings();
      if (!settings) return;

      const resolved: Required<UserSettings> = { ...DEFAULT_USER_SETTINGS, ...settings };

      // Apply each value unconditionally — React bails on same-value primitive state.
      setTheme(resolved.theme);
      setPalette(resolved.palette === 'cb' ? 'cb' : 'default');
      setDensity(normalizeDensity(resolved.density));
      setThemePreset(normalizeThemePreset(resolved.themePreset));
      setLayoutPreset(normalizeLayoutPreset(resolved.layoutPreset));

      // toggleTweak inverts the CURRENT state, so snapshot the live tweaks right
      // before calling it to avoid double-toggle on a concurrent state change.
      // At app load these are always the initial defaults (no user interaction yet).
      if (tweaks.sound !== resolved.sound) toggleTweak('sound');
      if (tweaks.narrate !== resolved.narrate) toggleTweak('narrate');
      if (tweaks.animate !== resolved.animate) toggleTweak('animate');
      if (tweaks.controls !== resolved.autoplay) toggleTweak('controls');
    })();
    // Intentionally omitting the appearance state from deps — we only want to
    // re-run when the auth identity changes, not on every local state change.
  }, [loading, isAnonymous, userId]);
}

/**
 * Builds a UserSettings blob from current workspace appearance state and
 * PUTs it to the server.  For guests it does nothing (returns false).
 */
export async function saveUserSettings(
  isAnonymous: boolean,
  appearance: {
    theme: string;
    palette: string;
    density: string;
    themePreset: string;
    layoutPreset: string;
    tweaks: { sound: boolean; narrate: boolean; animate: boolean; controls: boolean };
  },
): Promise<boolean> {
  if (isAnonymous) return false;
  const settings: Required<UserSettings> = {
    theme: appearance.theme as Required<UserSettings>['theme'],
    palette: appearance.palette as Required<UserSettings>['palette'],
    density: appearance.density as Required<UserSettings>['density'],
    themePreset: appearance.themePreset as Required<UserSettings>['themePreset'],
    layoutPreset: appearance.layoutPreset as Required<UserSettings>['layoutPreset'],
    sound: appearance.tweaks.sound,
    narrate: appearance.tweaks.narrate,
    animate: appearance.tweaks.animate,
    autoplay: appearance.tweaks.controls,
  };
  const result = await putUserSettings(settings);
  return result !== null;
}
