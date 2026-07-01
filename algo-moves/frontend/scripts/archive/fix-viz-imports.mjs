#!/usr/bin/env node
/** Fix vizKit imports — keep only symbols referenced in each file. */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'node_modules') continue;
      walk(p, out);
    } else if (p.endsWith('.tsx') || p.endsWith('.ts')) out.push(p);
  }
  return out;
}

const VIZ_RE = /import \{([^}]+)\} from '([^']+\/_shared\/vizKit)';\n?/;

for (const file of walk(join(root, 'src/plugins'))) {
  let content = readFileSync(file, 'utf8');
  const m = content.match(VIZ_RE);
  if (!m) continue;
  const symbols = m[1].split(',').map((s) => s.trim()).filter(Boolean);
  const path = m[2];
  const used = symbols.filter((sym) => {
    const re = new RegExp(`\\b${sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    const withoutImport = content.replace(m[0], '');
    return re.test(withoutImport);
  });
  if (used.length === 0) {
    content = content.replace(VIZ_RE, '');
  } else if (used.length !== symbols.length) {
    content = content.replace(VIZ_RE, `import { ${used.join(', ')} } from '${path}';\n`);
  }
  // Drop cn import if unused
  if (/import \{ cn \} from/.test(content) && !/\bcn\(/.test(content.replace(/import \{ cn \}[^;]+;\n?/, ''))) {
    content = content.replace(/import \{ cn \} from '[^']+';\n?/, '');
  }
  writeFileSync(file, content);
}
console.log('fix-viz-imports: done');
