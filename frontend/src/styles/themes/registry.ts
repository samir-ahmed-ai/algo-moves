import { themeSources } from './sources';

export const BASE_THEME_IDS = [
  'mint-saas',
  'sunset-warm',
  'violet-tech',
  'mauve-dev',
  'clay-soft',
  'cosmic-lilac',
  'retro-fps',
  'mono-gray',
  'neo-bold',
  'pastel-air',
  'rose-future',
  'pop-play',
] as const;

export const HYBRID_THEME_IDS = [
  'pastel-brutal',
  'clay-sunset',
  'mono-tech',
  'cosmic-clay',
  'rose-pop',
  'retro-mono',
  'tech-sharp',
  'mauve-dream',
] as const;

export type BaseThemeId = (typeof BASE_THEME_IDS)[number];
export type HybridThemeId = (typeof HYBRID_THEME_IDS)[number];
export type ThemePreset = BaseThemeId | HybridThemeId;

export const THEME_PRESETS: readonly ThemePreset[] = Object.freeze([
  ...BASE_THEME_IDS,
  ...HYBRID_THEME_IDS,
]);

export const DEFAULT_THEME_PRESET: ThemePreset = 'mint-saas';
const THEME_PRESET_SET = new Set<string>(THEME_PRESETS);

export type ThemeMeta = {
  id: ThemePreset;
  label: string;
  swatch: string;
  kind: 'base' | 'hybrid';
};

export type ThemePresetOption = ThemeMeta & {
  sourceAvailable: boolean;
};

const BASE_LABELS: Readonly<Record<BaseThemeId, string>> = {
  'mint-saas': 'Mint SaaS',
  'sunset-warm': 'Sunset Warm',
  'violet-tech': 'Violet Tech',
  'mauve-dev': 'Mauve Dev',
  'clay-soft': 'Clay Soft',
  'cosmic-lilac': 'Cosmic Lilac',
  'retro-fps': 'Retro FPS',
  'mono-gray': 'Mono Gray',
  'neo-bold': 'Neo Bold',
  'pastel-air': 'Pastel Air',
  'rose-future': 'Rose Future',
  'pop-play': 'Pop Play',
};

const HYBRID_LABELS: Readonly<Record<HybridThemeId, string>> = {
  'pastel-brutal': 'Pastel Brutal',
  'clay-sunset': 'Clay Sunset',
  'mono-tech': 'Mono Tech',
  'cosmic-clay': 'Cosmic Clay',
  'rose-pop': 'Rose Pop',
  'retro-mono': 'Retro Mono',
  'tech-sharp': 'Tech Sharp',
  'mauve-dream': 'Mauve Dream',
};

export const THEME_META: readonly ThemeMeta[] = Object.freeze(
  THEME_PRESETS.map((id) => ({
    id,
    label:
      (BASE_LABELS as Record<string, string>)[id] ??
      (HYBRID_LABELS as Record<string, string>)[id] ??
      id,
    swatch: themeSources[id]?.swatch ?? 'oklch(0.5 0 0)',
    kind: (BASE_THEME_IDS.includes(id as BaseThemeId) ? 'base' : 'hybrid') as 'base' | 'hybrid',
  })),
);

export const THEME_META_BY_ID: Readonly<Record<ThemePreset, ThemeMeta>> = THEME_META.reduce(
  (acc, meta) => {
    acc[meta.id] = meta;
    return acc;
  },
  {} as Record<ThemePreset, ThemeMeta>,
);

export const THEME_PRESET_OPTIONS: readonly ThemePresetOption[] = Object.freeze(
  THEME_META.map((meta) => ({
    ...meta,
    sourceAvailable: themeSources[meta.id] != null,
  })),
);

export function getThemeMeta(value: unknown): ThemeMeta {
  return THEME_META_BY_ID[normalizeThemePreset(value)];
}

export function getThemeSource(value: unknown) {
  const preset = normalizeThemePreset(value);
  return themeSources[preset] ?? themeSources[DEFAULT_THEME_PRESET];
}

/** Map legacy preset ids from share URLs to the nearest new preset. */
const LEGACY_PRESET_MAP: Readonly<Record<string, ThemePreset>> = {
  classic: 'mint-saas',
  ocean: 'cosmic-lilac',
  forest: 'mint-saas',
  grape: 'violet-tech',
};

export function normalizeThemePreset(value: unknown): ThemePreset {
  if (typeof value !== 'string') return DEFAULT_THEME_PRESET;
  const id = value.trim().toLowerCase();
  if (THEME_PRESET_SET.has(id)) {
    return id as ThemePreset;
  }
  if (id in LEGACY_PRESET_MAP) {
    return LEGACY_PRESET_MAP[id] ?? DEFAULT_THEME_PRESET;
  }
  return DEFAULT_THEME_PRESET;
}

export function isThemePreset(value: unknown): value is ThemePreset {
  return typeof value === 'string' && THEME_PRESET_SET.has(value);
}
