#!/usr/bin/env node
/** Fail if any prepManifest id lacks a prepSimulators/problems/*.tsx entry. */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(root, 'src/plugins/imported/prepManifest.ts');
const simDir = join(root, 'src/plugins/imported/prepSimulators/problems');

const raw = readFileSync(manifestPath, 'utf8');
const jsonMatch = raw.match(/export const PREP_DATA[^=]*=\s*(\[[\s\S]*\]);/);
if (!jsonMatch) {
  console.error('Could not parse prepManifest.ts');
  process.exit(1);
}
const entries = JSON.parse(jsonMatch[1]);
const ids = entries.map((e) => e.id);

const simIds = new Set();
for (const name of readdirSync(simDir)) {
  if (!name.endsWith('.tsx')) continue;
  const src = readFileSync(join(simDir, name), 'utf8');
  const m = src.match(/manifestId\s*=\s*['"]([^'"]+)['"]/);
  if (m) simIds.add(m[1]);
}

const missing = ids.filter((id) => !simIds.has(id));
if (missing.length) {
  console.error(`check-prep-simulator-coverage: ${missing.length} missing simulator(s):\n`);
  for (const id of missing) console.error(`  ${id}`);
  process.exit(1);
}
console.log(`check-prep-simulator-coverage: ok (${ids.length} prep problems, ${simIds.size} simulators)`);
