import { describe, expect, it } from 'vitest';
import { mergeTokens, splitTokens, tokensToCssVars, type AlgoTokens } from './mapTokens';

const SAMPLE: AlgoTokens = {
  bg: 'oklch(0.98 0 0)',
  surface: 'oklch(0.99 0 0)',
  'surface-2': 'oklch(0.95 0 0)',
  border: 'oklch(0.9 0 0)',
  'border-strong': 'oklch(0.7 0 0)',
  text: 'oklch(0.2 0 0)',
  'text-2': 'oklch(0.45 0 0)',
  'text-3': 'oklch(0.6 0 0)',
  accent: 'oklch(0.55 0.2 260)',
  'accent-bg': 'color-mix(in srgb, oklch(0.55 0.2 260) 16%, transparent)',
  'team0-bg': 'oklch(0.92 0 0)',
  'team0-stroke': 'oklch(0.9 0 0)',
  'team1-bg': 'color-mix(in srgb, oklch(0.6 0.15 30) 22%, transparent)',
  'team1-stroke': 'oklch(0.6 0.15 30)',
  'team1-text': 'oklch(0.5 0.12 30)',
  'team2-bg': 'color-mix(in srgb, oklch(0.55 0.15 200) 22%, transparent)',
  'team2-stroke': 'oklch(0.55 0.15 200)',
  'team2-text': 'oklch(0.45 0.12 200)',
  edge: 'oklch(0.9 0 0)',
  'edge-active': 'oklch(0.55 0.2 260)',
  'edge-clash': 'oklch(0.55 0.2 20)',
  ring: 'oklch(0.55 0.2 260)',
  good: 'oklch(0.6 0.15 145)',
  'good-bg': 'color-mix(in srgb, oklch(0.6 0.15 145) 22%, transparent)',
  bad: 'oklch(0.55 0.2 25)',
  'bad-bg': 'color-mix(in srgb, oklch(0.55 0.2 25) 22%, transparent)',
  radius: '0.5rem',
  sans: 'system-ui, sans-serif',
  mono: 'ui-monospace, monospace',
  'shadow-sm': '0 1px 2px hsl(0 0% 0% / 0.1)',
  'shadow-md': '0 2px 4px hsl(0 0% 0% / 0.12)',
  'shadow-lg': '0 4px 6px hsl(0 0% 0% / 0.15)',
  'shadow-xl': '0 8px 10px hsl(0 0% 0% / 0.18)',
  'border-width': '1px',
};

describe('mapTokens utilities', () => {
  it('round-trips split and merge', () => {
    const { colors, chrome } = splitTokens(SAMPLE);
    expect(mergeTokens(colors, chrome)).toEqual(SAMPLE);
  });

  it('emits stable css var block snapshot', () => {
    expect(tokensToCssVars(SAMPLE)).toMatchInlineSnapshot(`
      "  --bg: oklch(0.98 0 0);
        --surface: oklch(0.99 0 0);
        --surface-2: oklch(0.95 0 0);
        --border: oklch(0.9 0 0);
        --border-strong: oklch(0.7 0 0);
        --text: oklch(0.2 0 0);
        --text-2: oklch(0.45 0 0);
        --text-3: oklch(0.6 0 0);
        --accent: oklch(0.55 0.2 260);
        --accent-bg: color-mix(in srgb, oklch(0.55 0.2 260) 16%, transparent);
        --team0-bg: oklch(0.92 0 0);
        --team0-stroke: oklch(0.9 0 0);
        --team1-bg: color-mix(in srgb, oklch(0.6 0.15 30) 22%, transparent);
        --team1-stroke: oklch(0.6 0.15 30);
        --team1-text: oklch(0.5 0.12 30);
        --team2-bg: color-mix(in srgb, oklch(0.55 0.15 200) 22%, transparent);
        --team2-stroke: oklch(0.55 0.15 200);
        --team2-text: oklch(0.45 0.12 200);
        --edge: oklch(0.9 0 0);
        --edge-active: oklch(0.55 0.2 260);
        --edge-clash: oklch(0.55 0.2 20);
        --ring: oklch(0.55 0.2 260);
        --good: oklch(0.6 0.15 145);
        --good-bg: color-mix(in srgb, oklch(0.6 0.15 145) 22%, transparent);
        --bad: oklch(0.55 0.2 25);
        --bad-bg: color-mix(in srgb, oklch(0.55 0.2 25) 22%, transparent);
        --radius: 0.5rem;
        --sans: system-ui, sans-serif;
        --mono: ui-monospace, monospace;
        --shadow-sm: 0 1px 2px hsl(0 0% 0% / 0.1);
        --shadow-md: 0 2px 4px hsl(0 0% 0% / 0.12);
        --shadow-lg: 0 4px 6px hsl(0 0% 0% / 0.15);
        --shadow-xl: 0 8px 10px hsl(0 0% 0% / 0.18);
        --border-width: 1px;"
    `);
  });
});
