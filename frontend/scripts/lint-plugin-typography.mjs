#!/usr/bin/env node
/** Fail when plugins use banned hardcoded font-size classes (prefer vizKit / vizText). */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkTypographyClasses } from './lib/checkTypographyClasses.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pluginsDir = join(root, 'src/plugins');
const BANNED = /text-\[(?:7|8|9|10|11|12|13|14|15)(?:\.\d)?px\]/g;
const ALLOWED = ['vizKit.test.ts', 'vizTokens.ts'];

checkTypographyClasses({
  root,
  targetDir: pluginsDir,
  scriptName: 'lint-plugin-typography',
  banned: BANNED,
  allowedSuffixes: ALLOWED,
});
