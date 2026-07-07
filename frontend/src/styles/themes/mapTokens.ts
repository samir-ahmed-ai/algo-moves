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
