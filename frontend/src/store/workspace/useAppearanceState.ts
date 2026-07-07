import { useCallback, useEffect, useState } from 'react';
import { normalizeThemePreset, type ThemePreset } from '@/styles/themes/registry';
import type { ShareState } from '@/store/navigation/shareState';
import { normalizeLayoutPreset, type LayoutPreset } from '@/lib/canvas/layoutPrefs';
import {
  normalizeDensity,
  type Density,
  type Palette,
  type Theme,
  type Tweaks,
  type WorkspaceDefaults,
} from './workspace';
import type { WorkspaceAppearanceCtx } from './workspaceContextTypes';

/** Theme, palette, density and display tweaks, plus the document-element sync effects. */
export function useAppearanceState(
  shared: ShareState | null,
  savedDefaults: Partial<WorkspaceDefaults>,
): WorkspaceAppearanceCtx {
  const [theme, setTheme] = useState<Theme>(shared?.theme === 'light' ? 'light' : 'dark');
  const [density, setDensity] = useState<Density>(normalizeDensity(savedDefaults.density));
  const [palette, setPalette] = useState<Palette>(shared?.palette === 'cb' ? 'cb' : 'default');
  const [themePreset, setThemePreset] = useState<ThemePreset>(
    normalizeThemePreset(savedDefaults.themePreset ?? shared?.themePreset),
  );
  const [layoutPreset, setLayoutPreset] = useState<LayoutPreset>(
    normalizeLayoutPreset(savedDefaults.layoutPreset ?? 'TraceFocus'),
  );
  const [tweaks, setTweaks] = useState<Tweaks>({
    moveLog: true,
    caption: true,
    controls: true,
    animate: true,
    narrate: false,
    sound: false,
  });

  const cycleDensity = useCallback(() => {
    setDensity((d) => (d === 'compact' ? 'ultra' : d === 'ultra' ? 'spacious' : 'compact'));
  }, []);

  const toggleTweak = useCallback(
    (k: keyof Tweaks) => setTweaks((t) => ({ ...t, [k]: !t[k] })),
    [],
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('cb', palette === 'cb');
  }, [palette]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themePreset);
  }, [themePreset]);

  return {
    theme,
    setTheme,
    density,
    setDensity,
    cycleDensity,
    palette,
    setPalette,
    themePreset,
    setThemePreset,
    layoutPreset,
    setLayoutPreset,
    tweaks,
    toggleTweak,
  };
}
