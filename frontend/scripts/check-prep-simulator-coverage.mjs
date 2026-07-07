#!/usr/bin/env node
/** Fail if any prepManifest id lacks a prepSimulators/problems/*.tsx entry. */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectPrepSimulatorIds,
  missingPrepIds,
  readPrepManifestIds,
} from './lib/prepCoverage.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(root, 'src/plugins/imported/prepManifest.ts');
const simDir = join(root, 'src/plugins/imported/prepSimulators/problems');

let ids;
let simIds;
try {
  ids = readPrepManifestIds(manifestPath);
  simIds = collectPrepSimulatorIds(simDir);
} catch (error) {
  console.error(`check-prep-simulator-coverage: ${error.message}`);
  process.exit(1);
}

const missing = missingPrepIds(ids, simIds);
if (missing.length) {
  console.error(`check-prep-simulator-coverage: ${missing.length} missing simulator(s):\n`);
  for (const id of missing) console.error(`  ${id}`);
  process.exit(1);
}
console.log(
  `check-prep-simulator-coverage: ok (${ids.length} prep problems, ${simIds.size} simulators)`,
);
