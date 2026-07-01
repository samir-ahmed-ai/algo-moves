#!/usr/bin/env node
/** Fix imp-7 bipartite cases in migrated.ts: legacy top-level adj → WorkedCase.input shape. */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, 'src/plugins/imported/practice/migrated.ts');
const text = readFileSync(path, 'utf8');

function circleLayout(n, w = 352, h = 286, pad = 44) {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2 - pad;
  if (n <= 1) return [[Math.round(cx), Math.round(cy)]];
  return Array.from({ length: n }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [Math.round(cx + r * Math.cos(angle)), Math.round(cy + r * Math.sin(angle))];
  });
}

const m = text.match(/export const MIGRATED_BUNDLES = (\{[\s\S]*\}) as Record/);
if (!m) throw new Error('Could not parse MIGRATED_BUNDLES from migrated.ts');
const data = JSON.parse(m[1]);

const bip = data['imp-7-is-graph-bipartite'];
if (!bip?.cases) throw new Error('imp-7-is-graph-bipartite cases missing');

for (const section of ['good', 'bad']) {
  for (const c of bip.cases[section] ?? []) {
    if (c.adj && !c.input) {
      const adj = c.adj;
      delete c.adj;
      c.input = { adj, pos: circleLayout(adj.length) };
      c.inputLabel = c.inputLabel ?? `${adj.length} nodes`;
      c.returns = c.returns ?? (section === 'good' ? 'bipartite' : 'not bipartite');
      c.tone = c.tone ?? (section === 'good' ? 'ok' : 'bad');
    }
  }
}

const out = `import type { PracticeBundle } from '../../_shared/pluginKit';

/** Teaching content migrated from native curated plugins (now imported-canonical). */
export const MIGRATED_BUNDLES = ${JSON.stringify(data, null, 2)} as Record<string, PracticeBundle>;
`;

writeFileSync(path, out);
console.log('Fixed bipartite WorkedCase shapes in migrated.ts (removed @ts-nocheck).');
