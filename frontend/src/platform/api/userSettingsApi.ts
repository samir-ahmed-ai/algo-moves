import { arcadeFetch } from './arcadeClient';
import { DEFAULT_THEME_PRESET, type ThemePreset } from '@/styles/themes/registry';
import type { LayoutPreset } from '@/lib/canvas/layoutPrefs';

type Theme = 'dark' | 'light';
type Density = 'compact' | 'ultra' | 'spacious';
type Palette = 'default' | 'cb';

export interface UserSettings {
  theme?: Theme;
  themePreset?: ThemePreset;
  palette?: Palette;
  density?: Density;
  layoutPreset?: LayoutPreset;
  sound?: boolean;
  narrate?: boolean;
  animate?: boolean;
  /** Whether the global transport (play/step) bar is shown — mirrors tweaks.controls. */
  autoplay?: boolean;
}

export const DEFAULT_USER_SETTINGS: Required<UserSettings> = {
  theme: 'light', // signed-in accounts default to light (guests stay dark)
  themePreset: DEFAULT_THEME_PRESET,
  palette: 'default',
  density: 'compact',
  layoutPreset: 'TraceFocus',
  sound: false,
  narrate: false,
  animate: true,
  autoplay: true, // keep transport bar visible by default (matches app default)
};

export async function getUserSettings(): Promise<UserSettings | null> {
  return arcadeFetch<UserSettings>('/api/profiles/me/settings');
}

export async function putUserSettings(settings: UserSettings): Promise<UserSettings | null> {
  return arcadeFetch<UserSettings>('/api/profiles/me/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}
