#!/usr/bin/env node
// Print mobile deck coverage per catalog topic (animate / quiz / reassemble).
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const result = spawnSync('npx', ['vitest', 'run', 'src/shell/mobile/deckCoverage.test.ts'], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
});
process.exit(result.status ?? 1);
