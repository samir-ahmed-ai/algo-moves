#!/usr/bin/env node
/** Fail when shell uses banned hardcoded font-size classes (prefer chromeText / CSS vars). */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walkFiles } from './lib/walkFiles.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shellDir = join(root, 'src/shell');
const BANNED = /text-\[(?:7|8|9|10|11|12|13|14|15)(?:\.\d)?px\]/g;
const ALLOWED = [];

const hits = [];
for (const file of walkFiles(shellDir, (p) => p.endsWith('.tsx') || p.endsWith('.ts'))) {
  if (ALLOWED.some((a) => file.endsWith(a))) continue;
  const content = readFileSync(file, 'utf8');
  const matches = content.match(BANNED);
  if (matches) {
    for (const m of [...new Set(matches)])
      hits.push({ file: file.replace(root + '/', ''), match: m });
  }
}

if (hits.length) {
  console.error('check-shell-typography: banned hardcoded font sizes in shell:\n');
  for (const h of hits.slice(0, 40)) console.error(`  ${h.file}: ${h.match}`);
  if (hits.length > 40) console.error(`  … and ${hits.length - 40} more`);
  process.exit(1);
}
console.log('check-shell-typography: ok');
