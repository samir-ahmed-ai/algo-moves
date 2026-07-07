#!/usr/bin/env node
/** Gate prep simulator recording quality via integrity.test.ts (vitest). */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const r = spawnSync(
  'npx',
  ['vitest', 'run', 'src/plugins/integrity.test.ts', '-t', 'prep simulator quality|verdict truthfulness'],
  { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' },
);
process.exit(r.status ?? 1);
