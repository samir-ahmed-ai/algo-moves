import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { walkFiles } from './walkFiles.mjs';

export function checkTypographyClasses({
  root,
  targetDir,
  scriptName,
  banned,
  allowedSuffixes = [],
  maxHits = 40,
}) {
  const hits = [];
  const isCodeFile = (file) => file.endsWith('.tsx') || file.endsWith('.ts');

  for (const file of walkFiles(targetDir, isCodeFile)) {
    if (allowedSuffixes.some((suffix) => file.endsWith(suffix))) continue;
    const matches = readFileSync(file, 'utf8').match(banned);
    if (!matches) continue;
    for (const match of new Set(matches)) {
      hits.push({ file: relative(root, file), match });
    }
  }

  if (!hits.length) {
    console.log(`${scriptName}: ok`);
    return;
  }

  console.error(`${scriptName}: banned hardcoded font sizes:\n`);
  for (const hit of hits.slice(0, maxHits)) {
    console.error(`  ${hit.file}: ${hit.match}`);
  }
  if (hits.length > maxHits) {
    console.error(`  ... and ${hits.length - maxHits} more`);
  }
  process.exit(1);
}
