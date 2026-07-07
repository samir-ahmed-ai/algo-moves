#!/usr/bin/env node
/** Fail when shell uses banned hardcoded font-size classes (prefer chromeText / CSS vars). */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkTypographyClasses } from './lib/checkTypographyClasses.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shellDir = join(root, 'src/shell');
const BANNED = /text-\[(?:7|8|9|10|11|12|13|14|15)(?:\.\d)?px\]/g;

checkTypographyClasses({
  root,
  targetDir: shellDir,
  scriptName: 'check-shell-typography',
  banned: BANNED,
});
