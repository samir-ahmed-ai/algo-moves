#!/usr/bin/env node
/**
 * Add `manifestId` to simulator problem files by matching `title` to manifest.
 * Also optionally inject InspectorRow import for files with local Row components.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(root, 'src/plugins/imported/manifest.ts');
const problemsDir = join(root, 'src/plugins/imported/simulators/problems');

const manifestText = readFileSync(manifestPath, 'utf8');
const titleToId = new Map();
for (const m of manifestText.matchAll(/"id":\s*"([^"]+)"[\s\S]*?"title":\s*"([^"]+)"/g)) {
  titleToId.set(m[2], m[1]);
}

let updated = 0;
for (const file of readdirSync(problemsDir).filter((f) => f.endsWith('.tsx'))) {
  const path = join(problemsDir, file);
  let src = readFileSync(path, 'utf8');
  if (/export const manifestId\s*=/.test(src)) continue;

  const titleMatch = src.match(/export const title\s*=\s*['"]([^'"]+)['"]/);
  if (!titleMatch) {
    console.warn(`skip ${file}: no title export`);
    continue;
  }
  const manifestId = titleToId.get(titleMatch[1]);
  if (!manifestId) {
    console.warn(`skip ${file}: title "${titleMatch[1]}" not in manifest`);
    continue;
  }

  src = src.replace(
    /export const title\s*=\s*['"][^'"]+['"];/,
    `export const manifestId = '${manifestId}';\nexport const title = '${titleMatch[1]}';`,
  );
  writeFileSync(path, src);
  updated++;
  console.log(`+ ${file} → ${manifestId}`);
}
console.log(`Updated ${updated} simulator files.`);
