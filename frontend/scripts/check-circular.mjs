#!/usr/bin/env node
/**
 * Circular dependency ratchet — runs madge and fails only when cycle count rises
 * above the recorded baseline (shrinks over time, never grows).
 */
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** Baseline at Wave 8 — ratchet down as cycles are broken. */
const MAX_CYCLES = 17;

let out = '';
let commandFailed = false;
try {
  out = execSync('npx madge --circular --extensions ts,tsx src', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (e) {
  commandFailed = true;
  out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
}

const match = out.match(/Found\s+(\d+)\s+circular dependencies!/i);
const foundNone = /No circular dependency found/i.test(out);

if (commandFailed && !match && !foundNone) {
  console.error(out.trim() || 'madge failed before reporting circular dependency count');
  process.exit(1);
}

const count = match ? Number(match[1]) : 0;

if (count > MAX_CYCLES) {
  console.error(out.trim());
  console.error(`\n✗ circular dependencies ${count} exceeds baseline ${MAX_CYCLES}`);
  process.exit(1);
}

console.log(`✓ circular dependencies ${count} (baseline ≤ ${MAX_CYCLES})`);
