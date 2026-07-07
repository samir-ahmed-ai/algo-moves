#!/usr/bin/env node
/** Gate prep simulator recording quality via integrity.test.ts (vitest).
 *  Requires every prep simulator input to emit >= 3 frames. */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEST_FILE = 'src/plugins/integrity.test.ts';
const TEST_NAME = 'prep simulator quality|verdict truthfulness';
const r = spawnSync('npx', ['vitest', 'run', TEST_FILE, '-t', TEST_NAME], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (r.error) {
  console.error(`check-prep-sim-quality: failed to start vitest: ${r.error.message}`);
  process.exit(1);
}

if (r.signal) {
  console.error(`check-prep-sim-quality: vitest terminated by ${r.signal}`);
  process.exit(1);
}

process.exit(r.status ?? 1);
