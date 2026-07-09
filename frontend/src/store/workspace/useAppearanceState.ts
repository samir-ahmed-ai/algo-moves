import { useCallback, useEffect, useRef, useState } from 'react';
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

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * Apply an appearance mutation, crossfading the whole surface via the View
 * Transitions API when supported. Skipped on the initial mount (`animate`
 * false) and under prefers-reduced-motion so only deliberate theme switches
 * dissolve; unsupported browsers just apply the change instantly.
 */
function applyAppearance(mutate: () => void, animate: boolean) {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { finished?: Promise<unknown> };
  };
  if (animate && typeof doc.startViewTransition === 'function' && !prefersReducedMotion()) {
    doc.startViewTransition(mutate);
  } else {
    mutate();
  }
}

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

  const themeMounted = useRef(false);
  const paletteMounted = useRef(false);
  const presetMounted = useRef(false);

  useEffect(() => {
    applyAppearance(
      () => document.documentElement.classList.toggle('dark', theme === 'dark'),
      themeMounted.current,
    );
    themeMounted.current = true;
  }, [theme]);

  useEffect(() => {
    applyAppearance(
      () => document.documentElement.classList.toggle('cb', palette === 'cb'),
      paletteMounted.current,
    );
    paletteMounted.current = true;
  }, [palette]);

  useEffect(() => {
    applyAppearance(
      () => document.documentElement.setAttribute('data-theme', themePreset),
      presetMounted.current,
    );
    presetMounted.current = true;
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
