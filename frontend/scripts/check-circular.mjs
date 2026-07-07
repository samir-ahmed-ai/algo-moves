#!/usr/bin/env node
/**
 * Circular dependency ratchet — runs madge and fails only when cycle count rises
 * above the recorded baseline (shrinks over time, never grows).
 */
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** Baseline at Wave 6 landing — ratchet down as cycles are broken. */
const MAX_CYCLES = 27;

let out = '';
try {
  execSync('npx madge --circular --extensions ts,tsx src', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (e) {
  out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
}

const match = out.match(/Found (\d+) circular dependencies!/);
const count = match ? Number(match[1]) : 0;

if (count > MAX_CYCLES) {
  console.error(out.trim());
  console.error(`\n✗ circular dependencies ${count} exceeds baseline ${MAX_CYCLES}`);
  process.exit(1);
}

console.log(`✓ circular dependencies ${count} (baseline ≤ ${MAX_CYCLES})`);
