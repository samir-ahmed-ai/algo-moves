#!/usr/bin/env node
/**
 * Migrate simulator + native plugin files to vizKit imports and components.
 * Run: node scripts/migrate-viz-kit.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function listTsx(dir) {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.tsx') && f !== 'index.tsx')
    .map((f) => join(dir, f));
}

function transform(content, vizImportPath, cnImportPath) {
  let next = content;
  const needed = new Set(['InspectorRow', 'VarGrid']);
  let needsCn = false;

  // Drop legacy inspector import (handled below via rebuild)
  next = next.replace(/import \{ InspectorRow, VarGrid \} from '[^']+\/_shared\/inspector';\n?/g, '');

  next = next.replace(/if \(!frame\) return <VarGrid empty="No frame\." \/>;/g, () => {
    needed.add('VizEmpty');
    return 'if (!frame) return <VizEmpty />;';
  });

  const smHint =
    /className="text-\[length:var\(--node-fs-sm,14px\)\] (text-ink[23])"/g;
  if (smHint.test(next)) {
    needsCn = true;
    needed.add('vizText');
    next = next.replace(
      smHint,
      "className={cn(vizText.sm, '$1')}",
    );
  }

  const xsHint =
    /className="text-\[length:var\(--node-fs-xs,13px\)\] (text-ink[23][^"]*)"/g;
  if (xsHint.test(next)) {
    needsCn = true;
    needed.add('vizText');
    next = next.replace(
      xsHint,
      "className={cn(vizText.xs, '$1')}",
    );
  }

  const smInk2Only = /className="text-\[length:var\(--node-fs-sm,14px\)\] text-ink2"/g;
  if (smInk2Only.test(next)) {
    needsCn = true;
    needed.add('vizText');
    next = next.replace(smInk2Only, "className={cn(vizText.sm, 'text-ink2')}");
  }

  if (/<PathDisplay\b/.test(next) || /text-\[34px\]/.test(next)) {
    if (/text-\[34px\]/.test(next)) {
      needed.add('PathDisplay');
      next = next.replace(
        /<div className="my-3 font-mono text-\[34px\][^"]*">\{([^}]+)\}<\/div>/g,
        '<PathDisplay value={$1} />',
      );
    }
  }

  if (/text-\[28px\]/.test(next) || /<ExprToken\b/.test(next)) {
    if (/<div className="my-3 font-mono text-\[28px\] text-ink">/.test(next)) {
      needed.add('ExprToken');
      next = next.replace(
        /<div className="my-3 font-mono text-\[28px\] text-ink">/g,
        '<ExprToken>',
      );
      // Close matching div — only when followed by simple content ending with </div>
    }
    if (/<div className="my-3 flex items-center gap-2 font-mono text-\[28px\] text-ink">/.test(next)) {
      needed.add('ExprToken');
      next = next.replace(
        /<div className="my-3 flex items-center gap-2 font-mono text-\[28px\] text-ink">/g,
        '<ExprToken>',
      );
    }
    // Fix unclosed ExprToken: replace first </div> after ExprToken open that was expr div
    // Safer: path lines use PathDisplay instead
    next = next.replace(
      /<ExprToken>\{([^}]+)\}<\/div>/g,
      '<ExprToken>{$1}</ExprToken>',
    );
    next = next.replace(
      /<ExprToken>([\s\S]*?)<\/div>\s*\n\s*<div className=\{cn\(vizText\.sm, 'text-ink2'\)\}/g,
      '<ExprToken>$1</ExprToken>\n      <div className={cn(vizText.sm, \'text-ink2\')}',
    );
  }

  // PathDisplay for expr-style path-only lines
  next = next.replace(
    /<div className="my-3 font-mono text-\[28px\] text-ink">\{([^}]+)\}<\/div>/g,
    () => {
      needed.add('PathDisplay');
      return '<PathDisplay value={$1} className={cn(vizText.expr)} />';
    },
  );

  // CharCell: h-9 w-9 text-[15px] spans
  if (/h-9 w-9[^"]*text-\[15px\]/.test(next)) {
    needed.add('CharCell');
    needed.add('vizText');
    needsCn = true;
    next = next.replace(
      /<span\s+key=\{([^}]+)\}\s+className=\{`flex h-9 w-9 items-center justify-center rounded border font-mono text-\[15px\] \$\{([^}]+)\} \$\{([^}]+)\}`\}\s*>\s*\{([^}]+)\}\s*<\/span>/g,
      '<CharCell key={$1} active={$2} className={cn($3)}>{$4}</CharCell>',
    );
  }

  // Rebuild imports
  const vizSymbols = [...needed].sort().join(', ');
  const vizLine = `import { ${vizSymbols} } from '${vizImportPath}';`;
  let cnLine = '';
  if (needsCn) {
    cnLine = `import { cn } from '${cnImportPath}';\n`;
  }

  // Remove old vizKit/cn imports if present
  next = next.replace(/import \{ cn \} from '[^']+';\n?/g, '');
  next = next.replace(/import \{[^}]+\} from '[^']+\/_shared\/vizKit';\n?/g, '');

  const lines = next.split('\n');
  let lastImport = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) lastImport = i + 1;
  }
  lines.splice(lastImport, 0, cnLine + vizLine);
  next = lines.join('\n');

  return next;
}

function migrateDir(dir, vizImportPath, cnImportPath) {
  let n = 0;
  for (const file of listTsx(dir)) {
    const raw = readFileSync(file, 'utf8');
    if (!raw.includes('_shared/inspector') && !raw.includes('--node-fs-sm') && !raw.includes('text-[34px]') && !raw.includes('text-[28px]') && !raw.includes('VarGrid empty')) {
      continue;
    }
    const out = transform(raw, vizImportPath, cnImportPath);
    if (out !== raw) {
      writeFileSync(file, out);
      n++;
    }
  }
  return n;
}

let total = 0;
total += migrateDir(
  join(root, 'src/plugins/imported/simulators/problems'),
  '../../../_shared/vizKit',
  '../../../../lib/cn',
);

for (const name of readdirSync(join(root, 'src/plugins'))) {
  const p = join(root, 'src/plugins', name);
  if (!statSync(p).isDirectory() || name.startsWith('_') || name === 'imported') continue;
  const idx = join(p, 'index.tsx');
  if (statSync(idx, { throwIfNoEntry: false })?.isFile()) {
    const raw = readFileSync(idx, 'utf8');
    const out = transform(raw, '../_shared/vizKit', '../../lib/cn');
    if (out !== raw) {
      writeFileSync(idx, out);
      total++;
    }
  }
}

// factory.tsx
const factory = join(root, 'src/plugins/imported/factory.tsx');
const factoryRaw = readFileSync(factory, 'utf8');
const factoryOut = transform(factoryRaw, '../_shared/vizKit', '../../lib/cn');
if (factoryOut !== factoryRaw) {
  writeFileSync(factory, factoryOut);
  total++;
}

console.log(`migrate-viz-kit: ${total} files updated`);
