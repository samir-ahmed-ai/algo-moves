/** Source token set parsed from a theme CSS file (:root or .dark block). */
export type SourceTokens = Record<string, string>;

/** algo-moves design tokens for one color mode. */
export type AlgoTokens = {
  bg: string;
  surface: string;
  'surface-2': string;
  border: string;
  'border-strong': string;
  text: string;
  'text-2': string;
  'text-3': string;
  accent: string;
  'accent-bg': string;
  'team0-bg': string;
  'team0-stroke': string;
  'team1-bg': string;
  'team1-stroke': string;
  'team1-text': string;
  'team2-bg': string;
  'team2-stroke': string;
  'team2-text': string;
  edge: string;
  'edge-active': string;
  'edge-clash': string;
  ring: string;
  good: string;
  'good-bg': string;
  bad: string;
  'bad-bg': string;
  radius: string;
  sans: string;
  mono: string;
  'shadow-sm': string;
  'shadow-md': string;
  'shadow-lg': string;
  'shadow-xl': string;
  'border-width': string;
};

export type ColorTokens = Pick<
  AlgoTokens,
  | 'bg'
  | 'surface'
  | 'surface-2'
  | 'border'
  | 'border-strong'
  | 'text'
  | 'text-2'
  | 'text-3'
  | 'accent'
  | 'accent-bg'
  | 'team0-bg'
  | 'team0-stroke'
  | 'team1-bg'
  | 'team1-stroke'
  | 'team1-text'
  | 'team2-bg'
  | 'team2-stroke'
  | 'team2-text'
  | 'edge'
  | 'edge-active'
  | 'edge-clash'
  | 'ring'
  | 'good'
  | 'good-bg'
  | 'bad'
  | 'bad-bg'
>;

export type ChromeTokens = Pick<
  AlgoTokens,
  'radius' | 'sans' | 'mono' | 'shadow-sm' | 'shadow-md' | 'shadow-lg' | 'shadow-xl' | 'border-width'
>;

const COLOR_KEYS: (keyof ColorTokens)[] = [
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

const CHROME_KEYS: (keyof ChromeTokens)[] = [
  'radius',
  'sans',
  'mono',
  'shadow-sm',
  'shadow-md',
  'shadow-lg',
  'shadow-xl',
  'border-width',
];

function pick(src: SourceTokens, key: string, fallback = ''): string {
  return src[key]?.trim() ?? fallback;
}

function mixBg(color: string, pct = 16): string {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

/** Map shadcn-style CSS vars to algo-moves tokens. */
export function mapSourceToAlgo(src: SourceTokens): AlgoTokens {
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
    'team0-bg': `color-mix(in srgb, ${mutedFg || pick(src, '--foreground')} 18%, ${pick(src, '--card')})`,
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

export function splitTokens(tokens: AlgoTokens): { colors: ColorTokens; chrome: ChromeTokens } {
  const colors = {} as ColorTokens;
  const chrome = {} as ChromeTokens;
  for (const k of COLOR_KEYS) colors[k] = tokens[k];
  for (const k of CHROME_KEYS) chrome[k] = tokens[k];
  return { colors, chrome };
}

export function mergeTokens(colors: ColorTokens, chrome: ChromeTokens): AlgoTokens {
  return { ...colors, ...chrome };
}

export function tokensToCssVars(tokens: AlgoTokens): string {
  return Object.entries(tokens)
    .map(([k, v]) => `  --${k}: ${v};`)
    .join('\n');
}

/** Parse :root and .dark blocks from a theme CSS file. */
export function parseThemeCss(css: string): { light: SourceTokens; dark: SourceTokens } {
  const light: SourceTokens = {};
  const dark: SourceTokens = {};

  const rootMatch = css.match(/:root\s*\{([^}]*)\}/s);
  const darkMatch = css.match(/\.dark\s*\{([^}]*)\}/s);

  const parseBlock = (block: string, out: SourceTokens) => {
    for (const line of block.split('\n')) {
      const m = line.match(/^\s*(--[\w-]+)\s*:\s*(.+?)\s*;?\s*$/);
      if (m) out[m[1]] = m[2];
    }
  };

  if (rootMatch) parseBlock(rootMatch[1], light);
  if (darkMatch) parseBlock(darkMatch[1], dark);

  return { light, dark };
}
