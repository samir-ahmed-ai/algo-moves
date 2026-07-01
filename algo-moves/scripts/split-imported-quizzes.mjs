#!/usr/bin/env node
/** Split IMPORTED_QUIZZES monolith into per-problem practice files. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const quizzesPath = join(root, 'src/plugins/imported/quizzes.ts');
const outDir = join(root, 'src/plugins/imported/practice/items');

mkdirSync(outDir, { recursive: true });

// Dynamic import the quizzes module
const quizzesMod = await import(join(root, 'src/plugins/imported/quizzes.ts'));
const quizzes = quizzesMod.IMPORTED_QUIZZES;

const imports = [];
const entries = [];

for (const [id, quiz] of Object.entries(quizzes)) {
  const safe = id.replace(/[^a-z0-9-]/gi, '_');
  const file = join(outDir, `${safe}.ts`);
  const content = `import type { PracticeBundle } from '../../_shared/pluginKit';

export const bundle: PracticeBundle = ${JSON.stringify({ quiz }, null, 2)};
`;
  writeFileSync(file, content);
  imports.push(`import { bundle as b_${safe} } from './items/${safe}';`);
  entries.push(`  '${id}': b_${safe},`);
}

const bundlesContent = `import type { PracticeBundle } from '../../_shared/pluginKit';
${imports.join('\n')}

/** Per-problem teaching bundles (quiz split from quizzes.ts monolith). */
export const IMPORTED_PRACTICE: Record<string, PracticeBundle> = {
${entries.join('\n')}
};
`;

writeFileSync(join(root, 'src/plugins/imported/practice/bundles.ts'), bundlesContent);
console.log(`Split ${Object.keys(quizzes).length} quiz bundles into practice/items/`);
