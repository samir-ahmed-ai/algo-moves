#!/usr/bin/env node
/**
 * Frame-state regression checks for migrated simulators (via Vitest).
 *
 * Usage:
 *   node scripts/verify-recorder-migration.mjs
 *   npm run verify-recorder-migration
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

try {
  execSync('npx vitest run src/plugins/recorderMigration.test.ts', { cwd: root, stdio: 'inherit' });
} catch {
  process.exit(1);
}
