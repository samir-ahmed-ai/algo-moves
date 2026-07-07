#!/usr/bin/env node
/** Grep-based guard for banned layout/typography literals outside token files. */
import { readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walkFiles } from './lib/walkFiles.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');

const TOKEN_FILES = new Set([
  'src/shell/canvas/nodeTokens.ts',
  'src/shell/canvas/canvasTokens.ts',
  'src/plugins/_shared/vizTokens.ts',
  'src/design/tokens.ts',
  'src/styles/theme.css',
  'src/index.css',
]);

const BANNED = [
  { re: /\bSIDEBAR_WIDE_W\s*=\s*400\b/g, label: 'SIDEBAR_WIDE_W = 400' },
  { re: /\bSIDE_DOCK_WIDTH\s*=\s*400\b/g, label: 'SIDE_DOCK_WIDTH = 400' },
  { re: /minWidth:\s*320\b/g, label: 'minWidth: 320' },
  { re: /minHeight:\s*280\b/g, label: 'minHeight: 280' },
];

function relativePath(file) {
  return relative(root, file).replace(/\\/g, '/');
}

const hits = [];
for (const file of walkFiles(src, (_p, name) => /\.(tsx?|css)$/.test(name))) {
  const rel = relativePath(file);
  if (TOKEN_FILES.has(rel)) continue;
  const content = readFileSync(file, 'utf8');
  for (const { re, label } of BANNED) {
    re.lastIndex = 0;
    const matches = content.match(re);
    if (matches) hits.push({ file: rel, label, count: matches.length });
  }
}

if (hits.length) {
  console.error('check-tokens: banned literals outside token files:\n');
  for (const h of hits) {
    console.error(`  ${h.file}: ${h.label}${h.count > 1 ? ` (${h.count} matches)` : ''}`);
  }
  process.exit(1);
}
console.log('check-tokens: ok');
