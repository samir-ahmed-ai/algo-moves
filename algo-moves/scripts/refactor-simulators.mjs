#!/usr/bin/env node
/**
 * Legacy simulator refactor — prefer `node scripts/migrate-viz-kit.mjs` for full vizKit migration.
 * This script only handles ancient inline Row boilerplate if re-run on stale files.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migrate = spawnSync(process.execPath, [join(root, 'scripts/migrate-viz-kit.mjs')], {
  stdio: 'inherit',
  cwd: root,
});
process.exit(migrate.status ?? 1);
