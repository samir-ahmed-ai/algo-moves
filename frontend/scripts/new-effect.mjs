#!/usr/bin/env node
// Scaffold a new EffectPlugin. Usage:
//   npm run new-effect -- <kebab-id> "Title" [--category time|drill|emphasis] [--dry-run]

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const CATEGORIES = new Set(['time', 'drill', 'emphasis']);

function parseArgs(argv) {
  const positional = [];
  const flags = { dryRun: false, category: 'time' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      flags.dryRun = true;
    } else if (arg === '--category') {
      flags.category = argv[++i] ?? '';
    } else if (arg.startsWith('--')) {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    } else {
      positional.push(arg);
    }
  }
  return { ...flags, id: positional[0], title: positional[1] ?? positional[0] };
}

function tsString(value) {
  return JSON.stringify(String(value));
}

const { dryRun, id, title, category } = parseArgs(args);

if (!id || !/^[a-z][a-z0-9-]*$/.test(id)) {
  console.error(
    'Usage: npm run new-effect -- <kebab-id> "Title" [--category time|drill|emphasis] [--dry-run]',
  );
  process.exit(1);
}

if (!CATEGORIES.has(category)) {
  console.error('  --category must be one of time, drill, emphasis.');
  process.exit(1);
}

const Pascal = id.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
const varName = `${id.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Effect`;

const template = `import { defineEffect } from '../../core/effectTypes';
import type { Frame } from '../../core/types';

export interface ${Pascal}Data {
  amount: number;
}

export const ${varName} = defineEffect<${Pascal}Data>({
  meta: { id: ${tsString(id)}, title: ${tsString(title)}, category: ${tsString(category)} },
  defaultData: { amount: 1 },
  transformFrames: (frames: Frame[], data) => frames,
  traceSnippet: (data) => \`${id}(\${data.amount})\`,
});
`;

const dir = join(root, 'src/effects/custom');
const file = join(dir, `${id}.ts`);

if (existsSync(file)) {
  console.error(`Already exists: ${file}`);
  process.exit(1);
}

if (dryRun) {
  console.log(template);
  process.exit(0);
}

mkdirSync(dir, { recursive: true });
writeFileSync(file, template);
console.log(`Created ${file}`);
console.log(`Register in src/effects/registry.ts: import { ${varName} } from './custom/${id}';`);
