#!/usr/bin/env node
/** Migrate native plugin inline inspector rows to vizKit. */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pluginsDir = join(root, 'src/plugins');

const ROW_BLOCK =
  /\n  const Row = \(\{ k, v \}: \{ k: string; v: string \| number \}\) => \(\n    <div className="flex items-baseline justify-between gap-3 py-\[3px\]">\n      <span className=\{cn\(vizText\.sm, 'text-ink3'\)\}>\{k\}<\/span>\n      <span className="font-mono text-\[length:var\(--node-fs,16px\)\] text-ink">\{v\}<\/span>\n    <\/div>\n  \);\n/g;

const NO_FRAME =
  /if \(!frame\) return <div className="px-\[var\(--hpad\)\] py-2 text-\[length:var\(--node-fs-sm,14px\)\] text-ink3">No frame\.<\/div>;/g;

function migrateFile(file) {
  let content = readFileSync(file, 'utf8');
  if (!content.includes('const Row = ({ k, v }')) return false;

  let next = content;
  next = next.replace(NO_FRAME, 'if (!frame) return <VizEmpty />;');
  next = next.replace(ROW_BLOCK, '\n');
  next = next.replace(/<Row /g, '<InspectorRow ');
  next = next.replace(
    /return \(\n    <div className="px-\[var\(--hpad\)\] py-2">/g,
    'return (\n    <VizInspector>',
  );
  next = next.replace(/\n    <\/div>\n  \);\n\}/g, '\n    </VizInspector>\n  );\n}');

  // Ensure vizKit import
  const vizImport = /import \{([^}]+)\} from '\.\.\/_shared\/vizKit';/;
  const m = next.match(vizImport);
  const need = new Set(['InspectorRow', 'VizEmpty', 'VizInspector']);
  if (m) {
    const existing = m[1].split(',').map((s) => s.trim()).filter(Boolean);
    for (const s of existing) need.add(s);
    const merged = [...need].filter((sym) => {
      const re = new RegExp(`\\b${sym}\\b`);
      return re.test(next.replace(vizImport, ''));
    });
    next = next.replace(vizImport, `import { ${merged.join(', ')} } from '../_shared/vizKit';`);
  } else {
    next = next.replace(
      /(import \{ wireTeachingStack \} from '\.\.\/_shared\/pluginKit';)/,
      "$1\nimport { InspectorRow, VizEmpty, VizInspector } from '../_shared/vizKit';",
    );
  }

  // Drop cn/vizText if unused
  if (!/\bcn\(/.test(next.replace(/import \{ cn \}[^;]+;\n?/, ''))) {
    next = next.replace(/import \{ cn \} from '\.\.\/\.\.\/lib\/cn';\n?/, '');
  }
  if (!/\bvizText\b/.test(next.replace(/import \{[^}]*vizText[^}]*\}[^;]+;\n?/, ''))) {
    next = next.replace(/import \{([^}]*?)vizText,?\s*([^}]*)\} from '\.\.\/_shared\/vizKit';/, (_, a, b) => {
      const parts = `${a}${b}`.split(',').map((s) => s.trim()).filter((s) => s && s !== 'vizText');
      return parts.length ? `import { ${parts.join(', ')} } from '../_shared/vizKit';` : '';
    });
  }

  if (next === content) return false;
  writeFileSync(file, next);
  return true;
}

let n = 0;
for (const name of readdirSync(pluginsDir)) {
  const p = join(pluginsDir, name);
  if (!statSync(p).isDirectory() || name.startsWith('_') || name === 'imported') continue;
  const idx = join(p, 'index.tsx');
  if (statSync(idx, { throwIfNoEntry: false })?.isFile() && migrateFile(idx)) n++;
}
console.log(`migrate-native-inspectors: ${n} files updated`);
