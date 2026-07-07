#!/usr/bin/env node
/** Phase 2 gate — simulators must not use banned hardcoded font sizes. */
import { readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walkFiles } from './lib/walkFiles.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = [
  join(root, 'src/plugins/imported/simulators/problems'),
  join(root, 'src/plugins/imported/prepSimulators/problems'),
];
const BANNED = /text-\[(?:10|11|12|13|14|15)(?:\.\d)?px\]/g;

const hits = [];
for (const dir of DIRS) {
  for (const file of walkFiles(dir, (_path, name) => name.endsWith('.tsx'))) {
    const content = readFileSync(file, 'utf8');
    BANNED.lastIndex = 0;
    const matches = content.match(BANNED);
    if (matches) {
      hits.push({
        file: relative(root, file).replace(/\\/g, '/'),
        match: [...new Set(matches)].join(', '),
      });
    }
  }
}

if (hits.length) {
  console.error('check-simulators: banned font sizes in simulators:\n');
  for (const h of hits) console.error(`  ${h.file}: ${h.match}`);
  process.exit(1);
}
console.log('check-simulators: ok');
