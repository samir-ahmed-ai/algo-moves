#!/usr/bin/env node
/** Fail when plugins use banned hardcoded font-size classes (prefer vizKit / vizText). */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pluginsDir = join(root, 'src/plugins');
const BANNED = /text-\[(?:7|8|9|10|11|12|13|14|15)(?:\.\d)?px\]/g;
const ALLOWED = ['vizKit.test.ts', 'vizTokens.ts'];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) out.push(p);
  }
  return out;
}

const hits = [];
for (const file of walk(pluginsDir)) {
  if (ALLOWED.some((a) => file.endsWith(a))) continue;
  const content = readFileSync(file, 'utf8');
  const matches = content.match(BANNED);
  if (matches) {
    for (const m of [...new Set(matches)]) hits.push({ file: file.replace(root + '/', ''), match: m });
  }
}

if (hits.length) {
  console.error('lint-plugin-typography: banned hardcoded font sizes in plugins:\n');
  for (const h of hits.slice(0, 40)) console.error(`  ${h.file}: ${h.match}`);
  if (hits.length > 40) console.error(`  … and ${hits.length - 40} more`);
  process.exit(1);
}
console.log('lint-plugin-typography: ok');
