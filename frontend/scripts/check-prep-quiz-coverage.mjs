#!/usr/bin/env node
/** Fail if any prep simulator lacks hand-authored practice.quiz content. */
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
let withQuiz;
try {
  ids = readPrepManifestIds(manifestPath);
  withQuiz = collectPrepSimulatorIds(
    simDir,
    (source) =>
      /practice:\s*\{\s*quiz:\s*practiceQuiz\s*\}/.test(source) &&
      /const practiceQuiz:/.test(source),
  );
} catch (error) {
  console.error(`check-prep-quiz-coverage: ${error.message}`);
  process.exit(1);
}

const missing = missingPrepIds(ids, withQuiz);
if (missing.length) {
  console.error(`check-prep-quiz-coverage: ${missing.length} missing practice quiz:\n`);
  for (const id of missing.slice(0, 20)) console.error(`  ${id}`);
  if (missing.length > 20) console.error(`  ... and ${missing.length - 20} more`);
  process.exit(1);
}
console.log(`check-prep-quiz-coverage: ok (${ids.length} prep problems with hand-authored quiz)`);
