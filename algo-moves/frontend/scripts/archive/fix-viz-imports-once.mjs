#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const dirs = [
  'src/plugins/imported/simulators/problems',
  'src/plugins/imported/prepSimulators/problems',
];
const syms = [
  'VizStage', 'RailGroup', 'RailStat', 'RailResult', 'RailStack', 'RailSection',
  'InspectorRow', 'VarGrid', 'VizEmpty', 'vizText', 'DpCell', 'DpHeader',
  'CharCell', 'PathDisplay', 'ExprToken',
];

for (const dir of dirs) {
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.tsx'))) {
    const fp = path.join(dir, file);
    let src = fs.readFileSync(fp, 'utf8');
    const body = src
      .split('\n')
      .filter((l) => !l.includes("from '../../../_shared/vizKit'") && !l.includes("from '../../../../lib/cn'"))
      .join('\n');

    const used = syms.filter((s) => new RegExp(`(<|\\b)${s}\\b`).test(body));
    const needCn = /\bcn\b/.test(body);
    const needVizText = /\bvizText\b/.test(body);

    src = src.replace(/\nimport \{ cn \} from '\.\.\/\.\.\/\.\.\/\.\.\/lib\/cn';/g, '');
    src = src.replace(/\nimport \{([^}]+)\} from '\.\.\/\.\.\/\.\.\/_shared\/vizKit';/g, '');

    const vizImports = [...used];
    if (needVizText && !vizImports.includes('vizText')) vizImports.push('vizText');

    const lines = [];
    if (needCn) lines.push("import { cn } from '../../../../lib/cn';");
    if (vizImports.length) lines.push(`import { ${vizImports.join(', ')} } from '../../../_shared/vizKit';`);

    if (lines.length) {
      src = src.replace(
        /import type \{ (?:ProblemSimulator|DpSimulator) \} from '\.\.\/types';/,
        `import type { ProblemSimulator } from '../types';\n${lines.join('\n')}`,
      );
    }
    fs.writeFileSync(fp, src);
  }
}

console.log('fixed viz imports');
