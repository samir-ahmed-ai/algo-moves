#!/usr/bin/env node
/**
 * AST codemod: migrate hand-rolled emit/frames with positional (non-spread) params
 * to createRecorder.
 *
 * Usage:
 *   node scripts/migrate-positional-emit.mjs --list-eligible
 *   node scripts/migrate-positional-emit.mjs --dry-run [--limit 30]
 *   node scripts/migrate-positional-emit.mjs --apply [--limit 30] [--batch file1,file2]
 *   node scripts/migrate-positional-emit.mjs --apply --all-eligible
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
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

function findRecordFunction(sourceFile) {
  let found = null;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'record' && node.body) {
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

function findRecorderDecl(recordFn, sourceFile) {
  for (const stmt of recordFn.body.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name)) continue;
      const name = decl.name.text;
      if (name !== 'emit' && name !== 'snap' && name !== 'snapshot') continue;
      const arrowFn = unwrapArrowBody(decl);
      if (!arrowFn) continue;
      const pushCall = extractPushFromBody(arrowFn.body, sourceFile);
      if (!pushCall) continue;
      return { stmt, decl, name, index: recordFn.body.statements.indexOf(stmt) };
    }
  }
  return null;
}

function unwrapArrowBody(decl) {
  let init = decl.initializer;
  if (!init) return null;
  if (ts.isParenthesizedExpression(init)) init = init.expression;
  if (!ts.isArrowFunction(init)) return null;
  return init;
}

function extractPushFromBody(body, sourceFile) {
  if (ts.isCallExpression(body) && body.expression.getText(sourceFile).includes('frames.push')) {
    return body;
  }
  if (ts.isBlock(body)) {
    for (const s of body.statements) {
      if (ts.isReturnStatement(s) && s.expression && ts.isCallExpression(s.expression)) {
        if (s.expression.expression.getText(sourceFile).includes('frames.push')) return s.expression;
      }
      if (ts.isExpressionStatement(s) && ts.isCallExpression(s.expression)) {
        if (s.expression.expression.getText(sourceFile).includes('frames.push')) return s.expression;
      }
    }
  }
  return null;
}

function parseRecorderParams(arrowFn, sourceFile) {
  const params = arrowFn.parameters;
  const names = params.map((p) => (ts.isIdentifier(p.name) ? p.name.text : null)).filter(Boolean);
  if (names.length < 3) return null;

  let hasTone = false;
  let toneIdx = -1;
  const last = params[params.length - 1];
  if (last?.type && getText(sourceFile, last.type).includes('good')) {
    hasTone = true;
    toneIdx = params.length - 1;
  }

  const stateParamNames = names.slice(3, hasTone ? toneIdx : names.length);
  const partialParam =
    stateParamNames.length === 1 &&
    params[3]?.type &&
    getText(sourceFile, params[3].type).includes('Partial<')
      ? stateParamNames[0]
      : null;

  const paramTypes = {};
  for (let i = 3; i < (hasTone ? toneIdx : params.length); i++) {
    const p = params[i];
    if (ts.isIdentifier(p.name)) {
      paramTypes[p.name.text] = p.type ? getText(sourceFile, p.type) : '';
    }
  }

  return { names, hasTone, stateParamNames, partialParam, paramTypes, recorderName: null };
}

function paramDefault(typeText) {
  if (!typeText) return 'null';
  if (typeText.includes('null')) return 'null';
  if (typeText.includes('boolean')) return 'false';
  if (typeText.includes('string')) return "''";
  if (typeText.includes('[]') || /\[\]/.test(typeText) || typeText.includes('Array')) return '[]';
  if (typeText.includes('number')) return '0';
  return 'null';
}

function paramInExpr(param, initText) {
  return new RegExp(`\\b${param}\\b`).test(initText);
}

function analyzeStateObject(stateInit, sourceFile, stateParamNames, partialParam, paramTypes = {}) {
  if (ts.isCallExpression(stateInit)) {
    const fnText = stateInit.expression.getText(sourceFile);
    if (fnText === 'snapshot' || fnText.endsWith('.snapshot')) {
      return {
        props: [],
        donePattern: 'type-done',
        spreadParam: partialParam,
        stateIsSnapshotCall: true,
        defaultsLines: ['...snapshot({})'],
        customMerge: 'snapshot',
        partialParam,
      };
    }
    return null;
  }

  if (!ts.isObjectLiteralExpression(stateInit)) return null;

  const props = [];
  const paramRewrites = {};
  let donePattern = null;
  let spreadParam = null;
  let stateIsSpreadBase = false;
  let carrySpread = false;
  let hasBooleanDoneField = false;

  for (const p of stateInit.properties) {
    if (ts.isSpreadAssignment(p)) {
      const spreadText = p.expression.getText(sourceFile);
      spreadParam = spreadText;
      if (spreadText === partialParam) continue;
      if (spreadText === 'base' || spreadText.startsWith('base')) stateIsSpreadBase = true;
      if (spreadText.includes('carry')) carrySpread = true;
      continue;
    }
    if (!ts.isPropertyAssignment(p) && !ts.isShorthandPropertyAssignment(p)) continue;

    const key = ts.isShorthandPropertyAssignment(p)
      ? p.name.text
      : p.name.getText(sourceFile);

    if (ts.isShorthandPropertyAssignment(p)) {
      props.push({ key, initText: key, source: stateParamNames.includes(key) ? 'param' : 'closure' });
      continue;
    }

    const init = p.initializer;
    const initText = getText(sourceFile, init);

    if (key === 'done') {
      if (/type\s*===\s*['"]DONE['"]/.test(initText)) {
        donePattern = 'type-done';
        hasBooleanDoneField = true;
      } else if (/tone\s*!=\s*null/.test(initText)) {
        donePattern = 'tone-done';
        hasBooleanDoneField = true;
      } else if (/phase\s*===\s*['"]done['"]/.test(initText)) {
        donePattern = 'phase-done';
        hasBooleanDoneField = true;
      } else if (stateParamNames.includes('done')) {
        donePattern = 'done-param';
        hasBooleanDoneField = true;
        props.push({ key, initText: 'false', source: 'param', paramName: 'done' });
      } else if (/\.slice\(\)/.test(initText)) {
        props.push({ key, initText, source: 'closure' });
      } else {
        props.push({ key, initText, source: 'closure' });
        if (initText === 'false' || initText === 'true') hasBooleanDoneField = true;
      }
      continue;
    }

    if (/type\s*===/.test(initText) && key !== 'done') {
      props.push({ key, initText: 'false', source: 'computed' });
      continue;
    }

    if (partialParam && initText.includes('??') && initText.includes(`${partialParam}.`)) {
      props.push({ key, initText: 'null', source: 'partial-default', partialKey: key });
      continue;
    }

    let matchedParam = stateParamNames.find((param) => paramInExpr(param, initText));
    if (matchedParam) {
      if (matchedParam !== key) {
        paramRewrites[matchedParam] = { field: key, template: initText };
      }
      props.push({ key, initText, source: 'param', paramName: matchedParam });
      continue;
    }

    props.push({ key, initText, source: 'closure' });
  }

  let customMerge = null;
  if (carrySpread) customMerge = 'carry';
  else if (stateIsSpreadBase && partialParam) customMerge = 'base-partial';
  else if (spreadParam && partialParam && spreadParam === partialParam) {
    // detect snapshotCounts pattern
    const hasSnapshotFn = props.some((p) => /snapshot/i.test(p.initText));
    if (hasSnapshotFn) customMerge = 'snapshot-fn';
  }

  const defaultsLines = props
    .filter((p) => p.source === 'closure' || p.source === 'computed' || p.source === 'partial-default')
    .map((p) => `${p.key}: ${p.initText}`);

  for (const param of stateParamNames) {
    if (param === 'done' && donePattern === 'done-param') continue;
    const rewrite = paramRewrites[param];
    const field = rewrite?.field ?? param;
    if (defaultsLines.some((l) => l.startsWith(`${field}:`))) continue;
    defaultsLines.push(`${field}: ${paramDefault(paramTypes[param] ?? '')}`);
  }

  if (hasBooleanDoneField && (donePattern === 'type-done' || donePattern === 'tone-done' || donePattern === 'phase-done' || donePattern === 'done-param' || !donePattern)) {
    if (!defaultsLines.some((l) => l.startsWith('done:'))) defaultsLines.push('done: false');
  }

  return {
    props,
    donePattern,
    spreadParam,
    defaultsLines,
    customMerge,
    partialParam,
    paramRewrites,
  };
}

function hasCreateRecorderImport(sourceFile) {
  for (const stmt of sourceFile.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    if (stmt.getFullText(sourceFile).includes('createRecorder')) return true;
  }
  return false;
}

function stmtEndWithNewline(sourceText, stmt) {
  let end = stmt.getEnd();
  while (end < sourceText.length && (sourceText[end] === ' ' || sourceText[end] === '\t')) end++;
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

function buildRecorderBlock(stateType, analysis, recorderFnName) {
  const { defaultsLines, donePattern, customMerge, partialParam } = analysis;
  const defaultsText = defaultsLines.join(',\n        ');

  let mergeBlock = '';
  if (customMerge === 'snapshot') {
    mergeBlock = `, {
    merge: (_base, partial) => snapshot(partial),
  }`;
  } else if (customMerge === 'carry') {
    mergeBlock = `, {
    merge: (base, partial) => ({ ...base, ...(carry as Partial<${stateType}>), ...partial }),
  }`;
  } else if (customMerge === 'base-partial') {
    mergeBlock = '';
    // base is constant — defaults already include ...base spread via closure
  } else if (customMerge === 'snapshot-fn') {
    const snapCall = defaultsLines.find((l) => /snapshot/i.test(l)) ?? 'snapshotCounts()';
    const fnName = snapCall.split(':')[1]?.trim().replace(/\(\)$/, '') ?? 'snapshotCounts';
    mergeBlock = `, {
    merge: (base, partial) => ({ ...base, ${snapCall.split(':')[0]?.trim() ?? 'counts'}: ${fnName}(), ...partial }),
  }`;
  }

  let block = `const { emit, frames } = createRecorder<${stateType}>(() => ({\n        ${defaultsText}\n      })${mergeBlock});`;

  if (donePattern === 'tone-done') {
    block += `\n  const emitDone = (\n    type: string,\n    note: string,\n    caption: string,\n    partial: Partial<${stateType}>,\n    tone?: 'good' | 'bad',\n  ) => emit(type, note, caption, { ...partial, done: true }, tone);`;
  }

  if (recorderFnName !== 'emit') {
    block += `\n  // renamed from ${recorderFnName}`;
  }

  return `\n\n  ${block}\n`;
}

function isToneLiteral(node, sourceFile) {
  if (!node) return false;
  const t = getText(sourceFile, node);
  return t === "'good'" || t === "'bad'";
}

function buildPartialFromCall(callExpr, sourceFile, analysis, recorderFnName) {
  const args = callExpr.arguments;
  if (args.length < 3) return null;

  let rest = args.slice(3);
  let toneArg = null;
  if (analysis.hasTone && rest.length > 0 && isToneLiteral(rest[rest.length - 1], sourceFile)) {
    toneArg = rest[rest.length - 1];
    rest = rest.slice(0, -1);
  }

  const typeText = getText(sourceFile, args[0]);

  let partialText;
  if (analysis.partialParam && rest.length >= 1) {
    partialText = getText(sourceFile, rest[0]);
    if (!partialText.startsWith('{')) partialText = `{ ...${partialText} }`;
  } else if (analysis.stateParamNames.length === 0) {
    partialText = '{}';
  } else {
    const parts = [];
    for (let i = 0; i < analysis.stateParamNames.length; i++) {
      const name = analysis.stateParamNames[i];
      const arg = rest[i];
      if (arg === undefined) continue;
      const argText = getText(sourceFile, arg);
      const rewrite = analysis.paramRewrites?.[name];
      if (rewrite) {
        const expr = rewrite.template.replace(new RegExp(`\\b${name}\\b`, 'g'), argText);
        parts.push(`${rewrite.field}: ${expr}`);
      } else {
        parts.push(`${name}: ${argText}`);
      }
    }
    partialText = `{ ${parts.join(', ')} }`;
  }

  // Inject done for type-done / phase-done patterns
  if (analysis.donePattern === 'type-done' && typeText === "'DONE'" && !partialText.includes('done:')) {
    if (partialText === '{}') partialText = '{ done: true }';
    else partialText = partialText.replace(/\}$/, ', done: true }');
  }

  if (analysis.donePattern === 'phase-done') {
    const phaseIdx = analysis.stateParamNames.indexOf('phase');
    if (phaseIdx >= 0 && rest[phaseIdx] && getText(sourceFile, rest[phaseIdx]) === "'done'") {
      if (!partialText.includes('done:')) {
        partialText = partialText.replace(/\}$/, ', done: true }');
      }
    }
  }

  if (analysis.donePattern === 'done-param') {
    const doneIdx = analysis.stateParamNames.indexOf('done');
    if (doneIdx >= 0 && rest[doneIdx] && !partialText.includes('done:')) {
      // done already included via param mapping
    }
  }

  const fnName =
    analysis.donePattern === 'tone-done' && toneArg ? 'emitDone' : recorderFnName;

  const newArgs = [
    getText(sourceFile, args[0]),
    getText(sourceFile, args[1]),
    getText(sourceFile, args[2]),
    partialText,
  ];
  if (toneArg) newArgs.push(getText(sourceFile, toneArg));

  return `${fnName}(${newArgs.join(', ')})`;
}

function isInsideEmitDone(node) {
  let p = node.parent;
  while (p) {
    if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name) && p.name.text === 'emitDone') return true;
    p = p.parent;
  }
  return false;
}

function transformRecorderCalls(sourceText, sourceFile, recordFn, analysis, recorderFnName) {
  const edits = [];

  function visit(node) {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (!ts.isIdentifier(callee)) return;
      if (callee.text !== recorderFnName && callee.text !== 'emit') return;
      if (isInsideEmitDone(node)) return;
      if (node.arguments.length > 3 && ts.isObjectLiteralExpression(node.arguments[3])) return;

      const replacement = buildPartialFromCall(node, sourceFile, analysis, 'emit');
      if (replacement) {
        edits.push({ start: node.getStart(sourceFile), end: node.getEnd(), text: replacement });
      }
    }
    ts.forEachChild(node, visit);
  }

  for (const stmt of recordFn.body.statements) visit(stmt);

  edits.sort((a, b) => b.start - a.start);
  let out = sourceText;
  for (const e of edits) {
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
  }
  return out;
}

function transformInlineFramesPush(sourceText, sourceFile, recordFn) {
  const edits = [];

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(sourceFile) === 'frames.push' &&
      node.arguments[0] &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      const arg = node.arguments[0];
      const moveProp = arg.properties.find(
        (p) => ts.isPropertyAssignment(p) && p.name.getText(sourceFile) === 'move',
      );
      const stateProp = arg.properties.find(
        (p) => ts.isPropertyAssignment(p) && p.name.getText(sourceFile) === 'state',
      );
      if (!moveProp || !stateProp || !ts.isPropertyAssignment(moveProp) || !ts.isPropertyAssignment(stateProp)) {
        return;
      }
      const move = moveProp.initializer;
      const state = stateProp.initializer;
      if (!ts.isObjectLiteralExpression(move) || !ts.isObjectLiteralExpression(state)) return;

      const typeP = move.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText(sourceFile) === 'type');
      const noteP = move.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText(sourceFile) === 'note');
      const captionP = move.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText(sourceFile) === 'caption');
      const toneP = move.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText(sourceFile) === 'tone');

      if (!typeP || !noteP || !captionP) return;

      const typeT = getText(sourceFile, typeP.initializer);
      const noteT = getText(sourceFile, noteP.initializer);
      const captionT = getText(sourceFile, captionP.initializer);
      const toneT = toneP ? getText(sourceFile, toneP.initializer) : null;
      const stateT = getText(sourceFile, state);

      const toneSuffix = toneT ? `, ${toneT}` : '';
      const replacement = `emit(${typeT}, ${noteT}, ${captionT}, ${stateT}${toneSuffix})`;
      edits.push({ start: node.getStart(sourceFile), end: node.getEnd(), text: replacement });
    }
    ts.forEachChild(node, visit);
  }

  for (const stmt of recordFn.body.statements) visit(stmt);

  edits.sort((a, b) => b.start - a.start);
  let out = sourceText;
  for (const e of edits) {
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
  }
  return out;
}

function fixBasePartialDefaults(sourceText, analysis) {
  if (analysis.customMerge !== 'base-partial') return sourceText;
  // Replace static base object reference in defaults with spread
  const baseMatch = sourceText.match(/const base:\s*\w+\s*=\s*\{[\s\S]*?\};/);
  if (!baseMatch) return sourceText;
  return sourceText; // defaults already extracted from state object which uses ...base
}

function migrateFile(filePath, options = {}) {
  const sourceText = options.sourceText ?? fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  if (!options.force && hasCreateRecorderImport(sourceFile)) {
    return { ok: false, reason: 'already migrated' };
  }

  const recordFn = findRecordFunction(sourceFile);
  if (!recordFn) return { ok: false, reason: 'no record fn' };

  const framesInfo = findFramesDecl(recordFn, sourceFile);
  if (!framesInfo) return { ok: false, reason: 'no frames decl' };

  const recorderInfo = findRecorderDecl(recordFn, sourceFile);
  if (!recorderInfo) return { ok: false, reason: 'no emit/snap stmt' };

  const arrowFn = unwrapArrowBody(recorderInfo.decl);
  if (!arrowFn) return { ok: false, reason: 'emit not arrow fn' };

  const pushCall = extractPushFromBody(arrowFn.body, sourceFile);
  if (!pushCall) return { ok: false, reason: 'no frames.push in emit' };

  const stateArg = pushCall.arguments[0];
  if (!stateArg) return { ok: false, reason: 'no push arg' };

  const paramInfo = parseRecorderParams(arrowFn, sourceFile);
  if (!paramInfo) return { ok: false, reason: 'bad emit params' };

  // Skip old spread-first partial pattern (handled by migrate-create-recorder.mjs)
  const isLegacySpreadPattern = (obj) => {
    if (!ts.isObjectLiteralExpression(obj)) return false;
    const props = obj.properties;
    const firstSpread = props.findIndex((p) => ts.isSpreadAssignment(p));
    if (firstSpread < 0) return false;
    const spreadName = props[firstSpread].expression.getText(sourceFile);
    const legacyNames = new Set(['s', 'over', 'extra', 'partial', 'patch', 'o', 'st']);
    if (!legacyNames.has(spreadName)) return false;
    // legacy: a few defaults then ...spread (e.g. { i: null, ...s })
    const beforeSpread = props.slice(0, firstSpread);
    return beforeSpread.length <= 4 && beforeSpread.every((p) => ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p));
  };

  let stateInit = stateArg;
  if (ts.isObjectLiteralExpression(stateArg)) {
    const stateProp = stateArg.properties.find(
      (p) => ts.isPropertyAssignment(p) && p.name.getText(sourceFile) === 'state',
    );
    if (stateProp && ts.isPropertyAssignment(stateProp)) {
      stateInit = stateProp.initializer;
      if (isLegacySpreadPattern(stateInit)) {
        return { ok: false, reason: 'spread pattern' };
      }
    }
  }

  const analysis = analyzeStateObject(stateInit, sourceFile, paramInfo.stateParamNames, paramInfo.partialParam, paramInfo.paramTypes);
  if (!analysis) return { ok: false, reason: 'cannot analyze state' };

  // Handle is-overlapped style: state = { ...base, ...s }
  if (ts.isObjectLiteralExpression(stateInit)) {
    const spreads = stateInit.properties.filter((p) => ts.isSpreadAssignment(p));
    if (spreads.length === 2 && paramInfo.partialParam) {
      const baseSpread = spreads.find((p) => p.expression.getText(sourceFile) === 'base');
      const partialSpread = spreads.find((p) => p.expression.getText(sourceFile) === paramInfo.partialParam);
      if (baseSpread && partialSpread) {
        analysis.customMerge = 'base-partial';
        const baseMatch = sourceText.match(/const base:\s*(\w+)\s*=\s*(\{[\s\S]*?\});/);
        if (baseMatch) {
          analysis.defaultsLines = [`...base`];
        }
      }
    }
  }

  if (analysis.customMerge === 'snapshot-fn') {
    // rebuild defaults from props excluding counts (handled in merge)
    const snapProp = analysis.props.find((p) => /snapshot/i.test(p.initText));
    analysis.defaultsLines = analysis.props
      .filter((p) => p.source !== 'partial' && p.key !== 'done' && !/snapshot/i.test(p.initText))
      .map((p) => `${p.key}: ${p.initText}`);
    analysis.defaultsLines.push(`${snapProp?.key ?? 'counts'}: ${snapProp?.initText.split(':')[1]?.trim() ?? 'snapshotCounts()'}`);
    analysis.defaultsLines.push('done: false');
  }

  if (analysis.customMerge === 'snapshot') {
    analysis.defaultsLines = ['...snapshot({})'];
  }

  const recorderBlock = buildRecorderBlock(framesInfo.stateType, analysis, recorderInfo.name);

  const framesStart = framesInfo.stmt.getFullStart(sourceFile);
  const framesEnd = stmtEndWithNewline(sourceText, framesInfo.stmt);
  const emitStart = recorderInfo.stmt.getFullStart(sourceFile);
  const emitEnd = stmtEndWithNewline(sourceText, recorderInfo.stmt);

  let newSource = sourceText;
  const structuralEdits = [
    { start: emitStart, end: emitEnd, text: recorderBlock },
    { start: framesStart, end: framesEnd, text: '' },
  ].sort((a, b) => b.start - a.start);

  for (const e of structuralEdits) {
    newSource = newSource.slice(0, e.start) + e.text + newSource.slice(e.end);
  }

  // Re-parse after structural edits for call transforms
  const sf2 = ts.createSourceFile(filePath, newSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const rf2 = findRecordFunction(sf2);
  if (!rf2) return { ok: false, reason: 're-parse failed' };

  const fullAnalysis = { ...paramInfo, ...analysis, recorderFnName: 'emit' };
  newSource = transformRecorderCalls(newSource, sf2, rf2, fullAnalysis, recorderInfo.name);
  newSource = transformInlineFramesPush(newSource, ts.createSourceFile(filePath, newSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), findRecordFunction(ts.createSourceFile(filePath, newSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)));

  // Rename snap calls to emit
  if (recorderInfo.name === 'snap' || recorderInfo.name === 'snapshot') {
    newSource = newSource.replace(new RegExp(`\\b${recorderInfo.name}\\(`, 'g'), 'emit(');
  }

  newSource = addImport(newSource);

  return { ok: true, src: newSource, stateType: framesInfo.stateType };
}

const remigrateFromGit = args.includes('--remigrate-from-git');

function headSource(repoPath) {
  try {
    return execSync(`git show HEAD:${repoPath}`, { encoding: 'utf8' });
  } catch {
    return null;
  }
}

function isPositionalInHead(repoPath) {
  const head = headSource(repoPath);
  if (!head || !head.includes('const frames: Frame')) return false;
  if (head.includes('createRecorder')) return false;
  return !/\.\.\.(s|over|extra|partial|patch|o|st)\b/.test(head.replace(/\n/g, ' '));
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

  if (remigrateFromGit) {
    files = files.filter((f) => {
      const repoPath = path.relative(path.join(root, '..'), f);
      return isPositionalInHead(repoPath);
    });
  }

  const results = files.map((file) => {
    if (remigrateFromGit) {
      const repoPath = path.relative(path.join(root, '..'), file);
      const src = headSource(repoPath);
      if (!src) return { file, ok: false, reason: 'no git head' };
      return { file, ...migrateFile(file, { force: true, sourceText: src }) };
    }
    return { file, ...migrateFile(file) };
  });

  if (listEligible) {
    for (const r of results.filter((x) => x.ok)) console.log(path.basename(r.file, '.tsx'));
    console.error(`\neligible: ${results.filter((x) => x.ok).length}`);
    return;
  }

  if (!dryRun && !apply && !allEligible && !remigrateFromGit) {
    console.error('Pass --dry-run, --apply, --list-eligible, --all-eligible, or --remigrate-from-git');
    process.exit(1);
  }

  const toApply = results.filter((x) => x.ok).slice(0, limit);
  const skipped = results.filter((x) => !x.ok);

  let applied = 0;
  for (const r of toApply) {
    if (dryRun) {
      console.log('[dry-run]', path.basename(r.file));
      applied++;
      continue;
    }
    fs.writeFileSync(r.file, r.src);
    console.log('[applied]', path.basename(r.file));
    applied++;
  }

  const skipReasons = {};
  for (const r of skipped) {
    skipReasons[r.reason] = (skipReasons[r.reason] ?? 0) + 1;
  }
  console.error(`\napplied: ${applied}, skipped: ${skipped.length}`);
  if (skipped.length) console.error('skip reasons:', skipReasons);

  const failed = skipped.filter((r) => r.reason !== 'already migrated');
  if (failed.length && (listEligible || dryRun || apply || allEligible)) {
    console.error('\nnot auto-migrated:');
    for (const r of failed.slice(0, 30)) {
      console.error(`  ${path.basename(r.file)}: ${r.reason}`);
    }
    if (failed.length > 30) console.error(`  ... and ${failed.length - 30} more`);
  }
}

main();
