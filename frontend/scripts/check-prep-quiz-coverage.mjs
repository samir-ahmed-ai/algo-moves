#!/usr/bin/env node
/** Fail if any prep simulator lacks hand-authored practice.quiz content. */
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

const withQuiz = new Set();
for (const name of readdirSync(simDir)) {
  if (!name.endsWith('.tsx')) continue;
  const src = readFileSync(join(simDir, name), 'utf8');
  const m = src.match(/manifestId\s*=\s*['"]([^'"]+)['"]/);
  if (!m) continue;
  if (/practice:\s*\{\s*quiz:\s*practiceQuiz\s*\}/.test(src) && /const practiceQuiz:/.test(src)) {
    withQuiz.add(m[1]);
  }
}

const missing = ids.filter((id) => !withQuiz.has(id));
if (missing.length) {
  console.error(`check-prep-quiz-coverage: ${missing.length} missing practice quiz:\n`);
  for (const id of missing.slice(0, 20)) console.error(`  ${id}`);
  if (missing.length > 20) console.error(`  ... and ${missing.length - 20} more`);
  process.exit(1);
}
console.log(`check-prep-quiz-coverage: ok (${ids.length} prep problems with hand-authored quiz)`);
