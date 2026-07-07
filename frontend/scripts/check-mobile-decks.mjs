#!/usr/bin/env node
// Print mobile deck coverage per catalog topic (animate / quiz / reassemble).
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEST_FILE = 'src/shell/mobile/deck/deckCoverage.test.ts';
const result = spawnSync('npx', ['vitest', 'run', TEST_FILE], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: false,
});

if (result.error) {
  console.error(`check-mobile-decks: failed to start vitest: ${result.error.message}`);
  process.exit(1);
}

if (result.signal) {
  console.error(`check-mobile-decks: vitest terminated by ${result.signal}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
