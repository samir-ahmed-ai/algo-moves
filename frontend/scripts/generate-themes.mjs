#!/usr/bin/env node
/**
 * Reads neutral-named raw theme CSS from src/styles/themes/raw/
 * and generates index.css + sources/index.ts for all 20 presets.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const rawDir = join(root, 'src/styles/themes/raw');
const outCss = join(root, 'src/styles/themes/index.css');
const outSources = join(root, 'src/styles/themes/sources/index.ts');

const BASE_IDS = [
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
];

const HYBRIDS = [
  { id: 'pastel-brutal', label: 'Pastel Brutal', colors: 'pastel-air', chrome: 'neo-bold' },
  { id: 'clay-sunset', label: 'Clay Sunset', colors: 'sunset-warm', chrome: 'clay-soft' },
  { id: 'mono-tech', label: 'Mono Tech', colors: 'violet-tech', chrome: 'mono-gray' },
  { id: 'cosmic-clay', label: 'Cosmic Clay', colors: 'cosmic-lilac', chrome: 'clay-soft' },
  { id: 'rose-pop', label: 'Rose Pop', colors: 'rose-future', chrome: 'pop-play' },
  { id: 'retro-mono', label: 'Retro Mono', colors: 'retro-fps', chrome: 'mono-gray' },
  { id: 'tech-sharp', label: 'Tech Sharp', colors: 'violet-tech', chrome: 'retro-fps' },
  { id: 'mauve-dream', label: 'Mauve Dream', colors: 'mauve-dev', chrome: 'pastel-air' },
];

const LABELS = {
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

function normalizeCssTokenValue(value) {
  return String(value).trim().replace(/,+$/, '');
}

function parseBlock(css, selector) {
  const re = new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`, 's');
  const m = css.match(re);
  const out = {};
  if (!m) return out;
  for (const line of m[1].split('\n')) {
    const lm = line.match(/^\s*(--[\w-]+)\s*:\s*(.+?)\s*;?\s*$/);
    if (lm) out[lm[1]] = normalizeCssTokenValue(lm[2]);
  }
  return out;
}

function pick(src, key, fallback = '') {
  return src[key] != null ? normalizeCssTokenValue(src[key]) : fallback;
}

function mixBg(color, pct = 16) {
  const normalized = normalizeCssTokenValue(color);
  return normalized ? `color-mix(in srgb, ${normalized} ${pct}%, transparent)` : 'transparent';
}

function mapSourceToAlgo(src) {
  const primary = pick(src, '--primary');
  const muted = pick(src, '--muted');
  const mutedFg = pick(src, '--muted-foreground');
  const destructive = pick(src, '--destructive');
  const chart1 = pick(src, '--chart-1');
  const chart2 = pick(src, '--chart-2');
  const chart3 = pick(src, '--chart-3');
  const chart4 = pick(src, '--chart-4');
  const chart5 = pick(src, '--chart-5');
  const border = pick(src, '--border');
  const ring = pick(src, '--ring');
  const isBrutal = border === 'oklch(0 0 0)' || border === 'oklch(1 0 0)';

  return {
    bg: pick(src, '--background'),
    surface: pick(src, '--card'),
    'surface-2': muted,
    border,
    'border-strong': ring || border,
    text: pick(src, '--foreground'),
    'text-2': mutedFg,
    'text-3': `color-mix(in srgb, ${mutedFg || pick(src, '--foreground')} 65%, transparent)`,
    accent: primary,
    'accent-bg': mixBg(primary),
    'team0-bg': muted,
    'team0-stroke': border,
    'team1-bg': mixBg(chart1, 22),
    'team1-stroke': chart1,
    'team1-text': chart2 || chart1,
    'team2-bg': mixBg(chart3, 22),
    'team2-stroke': chart3,
    'team2-text': chart4 || chart3,
    edge: border,
    'edge-active': ring,
    'edge-clash': destructive || chart4,
    ring,
    good: chart5 || chart1,
    'good-bg': mixBg(chart5 || chart1, 22),
    bad: destructive,
    'bad-bg': mixBg(destructive, 22),
    radius: pick(src, '--radius', '0.5rem'),
    sans: pick(src, '--font-sans', 'system-ui, sans-serif'),
    mono: pick(src, '--font-mono', 'ui-monospace, monospace'),
    'shadow-sm': pick(src, '--shadow-sm', '0 1px 2px hsl(0 0% 0% / 0.1)'),
    'shadow-md': pick(src, '--shadow-md', '0 2px 4px hsl(0 0% 0% / 0.12)'),
    'shadow-lg': pick(src, '--shadow-lg', '0 4px 6px hsl(0 0% 0% / 0.15)'),
    'shadow-xl': pick(src, '--shadow-xl', '0 8px 10px hsl(0 0% 0% / 0.18)'),
    'border-width': isBrutal ? '2px' : '1px',
  };
}

const COLOR_KEYS = [
  'bg',
  'surface',
  'surface-2',
  'border',
  'border-strong',
  'text',
  'text-2',
  'text-3',
  'accent',
  'accent-bg',
  'team0-bg',
  'team0-stroke',
  'team1-bg',
  'team1-stroke',
  'team1-text',
  'team2-bg',
  'team2-stroke',
  'team2-text',
  'edge',
  'edge-active',
  'edge-clash',
  'ring',
  'good',
  'good-bg',
  'bad',
  'bad-bg',
];

const CHROME_KEYS = [
  'radius',
  'sans',
  'mono',
  'shadow-sm',
  'shadow-md',
  'shadow-lg',
  'shadow-xl',
  'border-width',
];

function splitTokens(tokens) {
  const colors = {};
  const chrome = {};
  for (const k of COLOR_KEYS) colors[k] = tokens[k];
  for (const k of CHROME_KEYS) chrome[k] = tokens[k];
  return { colors, chrome };
}

function mergeTokens(colors, chrome) {
  return { ...colors, ...chrome };
}

function tokensToCssVars(tokens) {
  return Object.entries(tokens)
    .map(([k, v]) => `  --${k}: ${normalizeCssTokenValue(v)};`)
    .join('\n');
}

function emitBlock(selector, tokens) {
  return `${selector} {\n${tokensToCssVars(tokens)}\n}`;
}

const parsed = {};
for (const id of BASE_IDS) {
  const css = readFileSync(join(rawDir, `${id}.css`), 'utf8');
  const light = parseBlock(css, ':root');
  const dark = parseBlock(css, '.dark');
  const lightAlgo = mapSourceToAlgo(light);
  const darkAlgo = mapSourceToAlgo(Object.keys(dark).length ? dark : light);
  parsed[id] = {
    light: splitTokens(lightAlgo),
    dark: splitTokens(darkAlgo),
    swatch: light['--primary'] || lightAlgo.accent,
  };
}

const cssParts = ['/* Generated by scripts/generate-themes.mjs — do not edit by hand */', ''];

const sourcesExport = {};

for (const id of BASE_IDS) {
  const { light, dark, swatch } = parsed[id];
  const lightMerged = mergeTokens(light.colors, light.chrome);
  const darkMerged = mergeTokens(dark.colors, dark.chrome);
  cssParts.push(`/* ${LABELS[id]} */`);
  cssParts.push(emitBlock(`:root[data-theme='${id}']`, lightMerged));
  cssParts.push(emitBlock(`:root.dark[data-theme='${id}']`, darkMerged));
  cssParts.push('');
  sourcesExport[id] = { light: lightMerged, dark: darkMerged, swatch };
}

for (const h of HYBRIDS) {
  const colorSrc = parsed[h.colors];
  const chromeSrc = parsed[h.chrome];
  const lightMerged = mergeTokens(colorSrc.light.colors, chromeSrc.light.chrome);
  const darkMerged = mergeTokens(colorSrc.dark.colors, chromeSrc.dark.chrome);
  cssParts.push(`/* ${h.label} */`);
  cssParts.push(emitBlock(`:root[data-theme='${h.id}']`, lightMerged));
  cssParts.push(emitBlock(`:root.dark[data-theme='${h.id}']`, darkMerged));
  cssParts.push('');
  sourcesExport[h.id] = { light: lightMerged, dark: darkMerged, swatch: colorSrc.swatch };
}

writeFileSync(outCss, cssParts.join('\n'));

const ts = `/** Auto-generated by scripts/generate-themes.mjs */\nimport type { AlgoTokens } from '../mapTokens';\n\nexport type ThemeSource = {\n  light: AlgoTokens;\n  dark: AlgoTokens;\n  swatch: string;\n};\n\nexport const themeSources: Record<string, ThemeSource> = ${JSON.stringify(sourcesExport, null, 2)};\n`;
writeFileSync(outSources, ts);

console.log(`Wrote ${outCss}`);
console.log(`Wrote ${outSources}`);
console.log(
  `Themes: ${BASE_IDS.length} base + ${HYBRIDS.length} hybrids = ${BASE_IDS.length + HYBRIDS.length}`,
);
