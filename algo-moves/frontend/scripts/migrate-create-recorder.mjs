#!/usr/bin/env node
/**
 * AST codemod: migrate hand-rolled emit/frames to createRecorder.
 *
 * Usage:
 *   node scripts/migrate-create-recorder.mjs --list-eligible
 *   node scripts/migrate-create-recorder.mjs --dry-run [--limit 20]
 *   node scripts/migrate-create-recorder.mjs --apply [--limit 20] [--batch file1,file2]
 *   node scripts/migrate-create-recorder.mjs --apply --all-eligible
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const IMPORT_LINE = "import { createRecorder } from '../../../_shared/createRecorder';";

const dirs = [
  path.join(root, 'src/plugins/imported/prepSimulators/problems'),
  path.join(root, 'src/plugins/imported/simulators/problems'),
];

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const apply = args.includes('--apply');
const listEligible = args.includes('--list-eligible');
const allEligible = args.includes('--all-eligible');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;
const batchIdx = args.indexOf('--batch');
const batchFiles = batchIdx >= 0 ? args[batchIdx + 1].split(',').map((s) => s.trim()) : null;

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith('.tsx')) out.push(p);
  }
  return out;
}

function allProblemFiles() {
  return dirs.flatMap((d) => walk(d));
}

function getText(sourceFile, node) {
  return node.getFullText(sourceFile).trim();
}

function collectIdentifiersInNode(node, ids = new Set()) {
  if (ts.isIdentifier(node)) ids.add(node.text);
  ts.forEachChild(node, (c) => collectIdentifiersInNode(c, ids));
  return ids;
}

function findRecordFunction(sourceFile) {
  let found = null;
  function visit(node) {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name?.text === 'record' &&
      node.body
    ) {
      found = node;
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return found;
}

function frameStateType(typeNode, sourceFile) {
  if (!typeNode) return null;
  let ref = typeNode;
  if (ts.isArrayTypeNode(ref)) ref = ref.elementType;
  if (!ts.isTypeReferenceNode(ref)) return null;
  const typeName = ref.typeName;
  if (!ts.isIdentifier(typeName) || typeName.text !== 'Frame') return null;
  if (!ref.typeArguments?.[0]) return null;
  return getText(sourceFile, ref.typeArguments[0]);
}

function findFramesDecl(recordFn, sourceFile) {
  for (const stmt of recordFn.body.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || decl.name.text !== 'frames') continue;
      const stateType = frameStateType(decl.type, sourceFile);
      if (!stateType) continue;
      return { stmt, stateType, index: recordFn.body.statements.indexOf(stmt) };
    }
  }
  return null;
}

function findEmitStatement(recordFn) {
  for (const stmt of recordFn.body.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || decl.name.text !== 'emit') continue;
      return { stmt, index: recordFn.body.statements.indexOf(stmt), decl };
    }
  }
  return null;
}

function unwrapEmitBody(decl) {
  let init = decl.initializer;
  if (!init) return null;
  if (ts.isParenthesizedExpression(init)) init = init.expression;
  if (ts.isArrowFunction(init)) return init.body;
  return null;
}

function extractPushFromEmitBody(body, sourceFile) {
  if (ts.isCallExpression(body) && body.expression.getText(sourceFile).includes('frames.push')) {
    return body;
  }
  if (ts.isBlock(body)) {
    for (const s of body.statements) {
      if (ts.isReturnStatement(s) && s.expression && ts.isCallExpression(s.expression)) {
        if (s.expression.expression.getText(sourceFile).includes('frames.push')) {
          return s.expression;
        }
      }
      if (ts.isExpressionStatement(s) && ts.isCallExpression(s.expression)) {
        if (s.expression.expression.getText(sourceFile).includes('frames.push')) {
          return s.expression;
        }
      }
    }
  }
  return null;
}

function extractStateDefaults(pushCall, sourceFile) {
  const arg = pushCall.arguments[0];
  if (!arg || !ts.isObjectLiteralExpression(arg)) return null;
  const moveProp = arg.properties.find(
    (p) => ts.isPropertyAssignment(p) && p.name.getText(sourceFile) === 'move',
  );
  const stateProp = arg.properties.find(
    (p) => ts.isPropertyAssignment(p) && p.name.getText(sourceFile) === 'state',
  );
  if (!stateProp || !ts.isPropertyAssignment(stateProp)) return null;
  const stateInit = stateProp.initializer;
  if (!ts.isObjectLiteralExpression(stateInit)) return null;

  let spreadName = null;
  const defaultProps = [];
  for (const p of stateInit.properties) {
    if (ts.isSpreadAssignment(p)) {
      spreadName = p.expression.getText(sourceFile);
      break;
    }
    defaultProps.push(getText(sourceFile, p));
  }
  if (!spreadName) return null;

  const defaultsText = defaultProps.join(',\n        ');
  const defaultsIds = new Set();
  for (const p of stateInit.properties) {
    if (ts.isSpreadAssignment(p)) break;
    collectIdentifiersInNode(p, defaultsIds);
  }

  const defaultsFull = getText(sourceFile, stateInit);
  const usesToneDone = /done:\s*tone\s*!=\s*null/.test(defaultsFull);

  return { defaultsText, spreadName, defaultsIds, usesToneDone };
}

function hasCreateRecorderImport(sourceFile) {
  for (const stmt of sourceFile.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    const text = stmt.getFullText(sourceFile);
    if (text.includes('createRecorder')) return true;
  }
  return false;
}

function stmtEndWithNewline(sourceText, stmt, sourceFile) {
  let end = stmt.getEnd();
  while (end < sourceText.length && (sourceText[end] === '\r' || sourceText[end] === ' ' || sourceText[end] === '\t')) {
    if (sourceText[end] === '\r' || sourceText[end] === '\n') break;
    end++;
  }
  if (sourceText[end] === '\r') end++;
  if (sourceText[end] === '\n') end++;
  return end;
}

function addImport(sourceText) {
  if (/import\s*\{[^}]*\bcreateRecorder\b/.test(sourceText)) return sourceText;
  const importMatch = sourceText.match(/^import .+;\n/m);
  if (importMatch) {
    const pos = importMatch.index + importMatch[0].length;
    return sourceText.slice(0, pos) + IMPORT_LINE + '\n' + sourceText.slice(pos);
  }
  return IMPORT_LINE + '\n' + sourceText;
}

function buildRecorderBlock(stateType, defaultsText, usesToneDone) {
  const block = usesToneDone
    ? (() => {
        const defaultsClean = defaultsText.replace(/done:\s*tone\s*!=\s*null,?\s*/g, 'done: false,');
        return (
          `const { emit, frames } = createRecorder<${stateType}>(() => ({\n        ${defaultsClean}\n      }));\n` +
          `  const emitDone = (\n` +
          `    type: string,\n` +
          `    note: string,\n` +
          `    caption: string,\n` +
          `    partial: Partial<${stateType}>,\n` +
          `    tone?: 'good' | 'bad',\n` +
          `  ) => emit(type, note, caption, { ...partial, done: true }, tone);\n`
        );
      })()
    : `const { emit, frames } = createRecorder<${stateType}>(() => ({\n        ${defaultsText}\n      }));\n`;
  return `\n\n  ${block}`;
}

function replaceTerminalEmits(sourceText, usesToneDone) {
  if (!usesToneDone) return sourceText;
  return sourceText.replace(
    /(\n\s*)emit(\([\s\S]*?,\s*'(good|bad)'\s*\);)(\s*return frames;)/g,
    (m, indent, call, tone, ret) => {
      if (call.includes('emitDone')) return m;
      const inner = call.slice(5, -2);
      return `${indent}emitDone(${inner}, '${tone}');${ret}`;
    },
  );
}

function migrateFile(filePath) {
  const sourceText = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  if (hasCreateRecorderImport(sourceFile)) {
    return { ok: false, reason: 'already migrated' };
  }

  const recordFn = findRecordFunction(sourceFile);
  if (!recordFn) return { ok: false, reason: 'no record fn' };

  const framesInfo = findFramesDecl(recordFn, sourceFile);
  if (!framesInfo) return { ok: false, reason: 'no frames decl' };

  const emitInfo = findEmitStatement(recordFn);
  if (!emitInfo) return { ok: false, reason: 'no emit stmt' };

  const emitBody = unwrapEmitBody(emitInfo.decl);
  if (!emitBody) return { ok: false, reason: 'no emit body' };

  const pushCall = extractPushFromEmitBody(emitBody, sourceFile);
  if (!pushCall) return { ok: false, reason: 'no frames.push in emit' };

  const stateInfo = extractStateDefaults(pushCall, sourceFile);
  if (!stateInfo) return { ok: false, reason: 'no spread in state' };

  const { defaultsText, spreadName, usesToneDone } = stateInfo;
  const allowedSpread = new Set(['s', 'over', 'extra', 'partial', 'patch', 'o', 'st']);
  if (!allowedSpread.has(spreadName)) {
    return { ok: false, reason: `spread ${spreadName}` };
  }

  const recorderBlock = buildRecorderBlock(framesInfo.stateType, defaultsText, usesToneDone);

  const framesStart = framesInfo.stmt.getFullStart(sourceFile);
  const framesEnd = stmtEndWithNewline(sourceText, framesInfo.stmt, sourceFile);
  const emitStart = emitInfo.stmt.getFullStart(sourceFile);
  const emitEnd = stmtEndWithNewline(sourceText, emitInfo.stmt, sourceFile);

  const edits = [
    { start: emitStart, end: emitEnd, text: recorderBlock },
    { start: framesStart, end: framesEnd, text: '' },
  ].sort((a, b) => b.start - a.start);

  let newSource = sourceText;
  for (const { start, end, text } of edits) {
    newSource = newSource.slice(0, start) + text + newSource.slice(end);
  }

  newSource = addImport(newSource);
  newSource = replaceTerminalEmits(newSource, usesToneDone);

  return { ok: true, src: newSource, stateType: framesInfo.stateType, usesToneDone };
}

function resolveBatchFiles(names) {
  const all = allProblemFiles();
  return names.map((name) => {
    const base = name.endsWith('.tsx') ? name : `${name}.tsx`;
    const hit = all.find((f) => f.endsWith(`/${base}`) || path.basename(f, '.tsx') === name);
    if (!hit) throw new Error(`batch file not found: ${name}`);
    return hit;
  });
}

function main() {
  let files = batchFiles ? resolveBatchFiles(batchFiles) : allProblemFiles();

  const results = [];
  for (const file of files) {
    const r = migrateFile(file);
    results.push({ file, ...r });
  }

  if (listEligible) {
    for (const r of results.filter((x) => x.ok)) {
      console.log(path.basename(r.file, '.tsx'));
    }
    console.error(`\neligible: ${results.filter((x) => x.ok).length}`);
    return;
  }

  const toApply = results.filter((x) => x.ok).slice(0, limit);
  const skipped = results.filter((x) => !x.ok);

  if (!dryRun && !apply && !allEligible) {
    console.error('Pass --dry-run, --apply, --list-eligible, or --all-eligible');
    process.exit(1);
  }

  let applied = 0;
  for (const r of toApply) {
    if (dryRun) {
      console.log('[dry-run]', path.basename(r.file));
      applied++;
      continue;
    }
    if (apply || allEligible) {
      fs.writeFileSync(r.file, r.src);
      console.log('[applied]', path.basename(r.file));
      applied++;
    }
  }

  const skipReasons = {};
  for (const r of skipped) {
    skipReasons[r.reason] = (skipReasons[r.reason] ?? 0) + 1;
  }

  console.error(`\napplied: ${applied}, skipped: ${skipped.length}`);
  if (skipped.length) console.error('skip reasons:', skipReasons);
}

main();
