#!/usr/bin/env node
/**
 * Repair quiz labels in imported practice bundles.
 * Uses shared rules from quiz-label-rules.mjs; restores from git HEAD when helpful.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  BAD_HEADLINE_END,
  COMMA_BEFORE_DASH,
  GENERIC_DETAILS,
  MIDWORD_ELLIPSIS,
  truncateAtWord,
} from './quiz-label-rules.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(ROOT, '..');
const GIT_ROOT = path.join(REPO, '..');

function labelIssues(label) {
  const trimmed = label.trim();
  if (trimmed.length > 72) return 'over72';
  if (COMMA_BEFORE_DASH.test(trimmed)) return 'commaSplit';
  const m = trimmed.match(/^(.+?)\s+[—–]\s+(.+)$/);
  if (!m) return 'noDetail';
  const headline = m[1].trim();
  const detail = m[2].trim();
  if (headline.includes('…')) return 'truncatedHeadline';
  if (GENERIC_DETAILS.has(detail.toLowerCase())) return 'genericDetail';
  if (BAD_HEADLINE_END.test(headline)) return 'badHeadlineEnd';
  if (MIDWORD_ELLIPSIS.test(trimmed)) return 'midWord';
  return null;
}

function guessDetail(headline, isCorrect) {
  const h = headline.toLowerCase();
  if (/^o\([^)]+\)/i.test(headline)) {
    if (/^O\(1\)/i.test(headline)) return isCorrect ? 'constant extra space' : 'wrong growth rate';
    if (/^O\(log n\)/i.test(headline)) return isCorrect ? 'halve each step' : 'too fast or slow';
    if (/^O\(n\)/i.test(headline) && !/log|²|\^/i.test(headline)) return isCorrect ? 'linear pass' : 'wrong order';
    if (/^O\(n log n\)/i.test(headline)) return isCorrect ? 'sort or divide' : 'wrong bound';
    if (/^O\(n²\)/i.test(headline)) return isCorrect ? 'nested loops' : 'too optimistic';
    if (/^O\(2ⁿ\)/i.test(headline)) return isCorrect ? 'exponential branches' : 'too fast';
    if (/^O\(m·n\)/i.test(headline)) return isCorrect ? 'grid fill' : 'wrong grid cost';
    return isCorrect ? 'matches this solution' : 'wrong complexity';
  }
  if (/backtrack/i.test(h)) return isCorrect ? 'try, recurse, undo' : 'different technique';
  if (/dynamic programming|dp\[/i.test(h)) return isCorrect ? 'table over subproblems' : 'wrong recurrence';
  if (/greedy/i.test(h)) return isCorrect ? 'local optimal pick' : 'needs proof';
  if (/bfs|queue|breadth/i.test(h)) return isCorrect ? 'level-by-level walk' : 'wrong traversal';
  if (/dfs|stack|depth/i.test(h)) return isCorrect ? 'deep recursion walk' : 'wrong traversal';
  if (/binary search/i.test(h)) return isCorrect ? 'halve sorted range' : 'needs sorted input';
  if (/dijkstra|shortest path/i.test(h)) return isCorrect ? 'relax edge weights' : 'wrong shortest path';
  if (/union.?find|disjoint/i.test(h)) return isCorrect ? 'merge components' : 'wrong structure';
  if (/topological|topo sort/i.test(h)) return isCorrect ? 'DAG ordering' : 'wrong graph order';
  if (/two pointer/i.test(h)) return isCorrect ? 'both ends converge' : 'wrong move rule';
  if (/sliding window/i.test(h)) return isCorrect ? 'expand shrink window' : 'wrong invariant';
  if (/heap|priority/i.test(h)) return isCorrect ? 'extremum each step' : 'wrong structure';
  if (/memo/i.test(h)) return isCorrect ? 'cache subresults' : 'recomputes work';
  if (isCorrect) return 'matches this problem';
  return 'wrong approach here';
}

function detailFromExplain(explain, headline, isCorrect) {
  if (!explain) return guessDetail(headline, isCorrect);
  const plain = explain.replace(/`/g, '').replace(/\s+/g, ' ').trim();
  const clauses = plain.split(/[.;!]/).map((s) => s.trim()).filter(Boolean);
  for (const clause of clauses) {
    const c = truncateAtWord(clause, 38);
    if (c.length >= 8 && !GENERIC_DETAILS.has(c.toLowerCase())) {
      return isCorrect ? truncateAtWord(clause, 38) : truncateAtWord(`not: ${clause}`, 38).replace(/^not: /, '');
    }
  }
  const first = truncateAtWord(plain, 38);
  if (first.length >= 8) return first;
  return guessDetail(headline, isCorrect);
}

const STOP_HEADLINE_END =
  /\b(have|has|had|are|is|was|were|been|a|an|the|no|at|on|in|to|for|with|by|from|that|when|where|if|so|as|may|would|could|should|can|will|be|of|and|or|not|its|it|an|dequeued|being|each|all|any|some|this|that|before|after|into|onto|upon|over|under|between|through|during|without|within|against|about|above|below|part|per|via|using|while|until|since|than|then|also|only|just|even|still|already|never|ever|both|either|neither|every|other|such|same|own|new|old|first|last|next|each|both|few|many|much|more|most|less|least|very|too|so|how|what|which|who|whom|whose|why|un|an)\s*$/i;

function trimHeadlineStopWords(headline) {
  let words = headline.trim().split(/\s+/);
  while (words.length > 1 && STOP_HEADLINE_END.test(words.join(' '))) {
    words.pop();
  }
  return words.join(' ').trim() || headline.trim();
}

function formatFromPlain(text, isCorrect, explain) {
  let plain = text.replace(/\s+/g, ' ').replace(/…/g, '').replace(/\.\.\./g, '').trim();
  if (!plain) return `Answer — ${detailFromExplain(explain, 'Answer', isCorrect)}`;

  let headline;
  let detail;

  if (plain.includes(',')) {
    const comma = plain.indexOf(',');
    headline = trimHeadlineStopWords(truncateAtWord(plain.slice(0, comma).trim(), 36));
    detail = truncateAtWord(plain.slice(comma + 1).trim(), 38) || detailFromExplain(explain, headline, isCorrect);
  } else if (plain.includes(' — ') || plain.includes(' – ')) {
    const m = plain.match(/^(.+?)\s+[—–]\s+(.+)$/);
    headline = trimHeadlineStopWords(truncateAtWord(m[1].trim(), 36));
    detail = truncateAtWord(m[2].trim(), 38) || detailFromExplain(explain, headline, isCorrect);
  } else {
    const words = plain.split(/\s+/);
    let take = Math.min(words.length, 5);
    headline = trimHeadlineStopWords(truncateAtWord(words.slice(0, take).join(' '), 36));
    detail =
      words.length <= take
        ? detailFromExplain(explain, headline, isCorrect)
        : truncateAtWord(words.slice(take).join(' '), 38) || detailFromExplain(explain, headline, isCorrect);
  }

  if (GENERIC_DETAILS.has(detail.toLowerCase())) detail = detailFromExplain(explain, headline, isCorrect);

  let out = `${headline} — ${detail}`;
  if (out.length > 72) {
    headline = trimHeadlineStopWords(truncateAtWord(headline, 24));
    detail = detailFromExplain(explain, headline, isCorrect);
    out = `${headline} — ${detail}`;
  }
  if (out.length > 72) out = `${truncateAtWord(headline, 20)} — ${truncateAtWord(detail, 38)}`;
  return out.slice(0, 72);
}

function mergeSplitLabel(headline, detail, isCorrect, explain) {
  const merged = `${headline.trim()} ${detail.trim()}`.replace(/,\s*$/, '').replace(/\s+/g, ' ');
  return formatFromPlain(merged, isCorrect, explain);
}

function repairLabel(label, isCorrect, explain, original) {
  const source = original && original !== label ? original : label;
  let trimmed = label.trim();

  if (original && labelIssues(original) === null && original.length <= 72) {
    const m = original.match(/^(.+?),\s*(.+)$/);
    if (m && !original.includes(' — ')) {
      return formatFromPlain(original, isCorrect, explain);
    }
    if (!original.includes(' — ') && original.length <= 60) {
      return `${truncateAtWord(original, 36)} — ${detailFromExplain(explain, original, isCorrect)}`.slice(0, 72);
    }
  }

  trimmed = trimmed.replace(/\w…/g, (m) => m[0]).replace(/…/g, '');
  const match = trimmed.match(/^(.+?) [—–] (.+)$/);

  if (!match) return formatFromPlain(source.replace(/…/g, ''), isCorrect, explain);

  let headline = match[1].trim().replace(/…/g, '').replace(/,\s*$/, '');
  let detail = match[2].trim().replace(/…/g, '').trim();

  const issue = labelIssues(label);
  if (
    issue ||
    COMMA_BEFORE_DASH.test(label) ||
    BAD_HEADLINE_END.test(headline) ||
    STOP_HEADLINE_END.test(headline) ||
    headline.includes('…') ||
    GENERIC_DETAILS.has(detail.toLowerCase()) ||
    trimmed.length > 72
  ) {
    const merged = COMMA_BEFORE_DASH.test(label)
      ? `${headline.replace(/,\s*$/, '')} ${detail}`
      : `${headline} ${detail}`;
    return formatFromPlain(merged, isCorrect, explain);
  }

  return trimmed;
}

function parseBundleJson(content) {
  const marker = content.indexOf('export const bundle');
  const migrated = content.indexOf('export const MIGRATED_BUNDLES');
  const start =
    marker >= 0
      ? content.indexOf('{', marker)
      : migrated >= 0
        ? content.indexOf('{', migrated)
        : content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start < 0 || end < 0) return null;
  try {
    return JSON.parse(content.slice(start, end + 1));
  } catch {
    return null;
  }
}

function gitOriginalLabels(file) {
  const rel = path.relative(GIT_ROOT, file);
  try {
    const raw = execSync(`git show HEAD:${rel}`, { cwd: GIT_ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    const bundle = parseBundleJson(raw);
    if (!bundle?.quiz) return null;
    const map = new Map();
    for (const q of bundle.quiz) {
      for (const c of q.choices) map.set(c.label, c.label);
    }
    return bundle;
  } catch {
    return null;
  }
}

function bundleHeader(content) {
  const marker = content.indexOf('export const bundle');
  if (marker >= 0) {
    const brace = content.indexOf('{', marker);
    return content.slice(0, brace);
  }
  const migrated = content.indexOf('export const MIGRATED_BUNDLES');
  if (migrated >= 0) {
    const brace = content.indexOf('{', migrated);
    return content.slice(0, brace);
  }
  return content.slice(0, content.indexOf('{'));
}

function processJsonBundle(file, content) {
  const bundle = parseBundleJson(content);
  if (!bundle?.quiz && !bundle?.codePieces) {
    // migrated.ts is a map of bundles, not a single bundle
    if (file.endsWith('migrated.ts')) return processMigratedFile(file, content);
    return { content, count: 0 };
  }
  if (!bundle?.quiz) return { content, count: 0 };

  const gitBundle = gitOriginalLabels(file);
  let count = 0;

  for (let qi = 0; qi < bundle.quiz.length; qi++) {
    const q = bundle.quiz[qi];
    const gitQ = gitBundle?.quiz?.[qi];
    for (let ci = 0; ci < q.choices.length; ci++) {
      const c = q.choices[ci];
      const gitLabel = gitQ?.choices?.[ci]?.label;
      const repaired = repairLabel(c.label, !!c.correct, q.explain, gitLabel);
      if (repaired !== c.label) {
        c.label = repaired;
        count++;
      }
    }
  }

  if (!count) return { content, count: 0 };

  const header = bundleHeader(content);
  const newContent = `${header}${JSON.stringify(bundle, null, 2)};\n`;
  return { content: newContent, count };
}

function processMigratedFile(file, content) {
  const bundleMap = parseBundleJson(content);
  if (!bundleMap || typeof bundleMap !== 'object') return { content, count: 0 };
  let count = 0;
  for (const [id, bundle] of Object.entries(bundleMap)) {
    if (!bundle?.quiz) continue;
    for (const q of bundle.quiz) {
      for (const c of q.choices) {
        const repaired = repairLabel(c.label, !!c.correct, q.explain, undefined);
        if (repaired !== c.label) {
          c.label = repaired;
          count++;
        }
      }
    }
  }
  if (!count) return { content, count: 0 };
  const header = bundleHeader(content);
  return { content: `${header}${JSON.stringify(bundleMap, null, 2)};\n`, count };
}

function processNativePractice(file, content) {
  let count = 0;
  const updated = content.replace(
    /(label: '([^'\\]*(?:\\.[^'\\]*)*)'(?:,\s*\n\s*correct: true)?)/g,
    (block, _full, rawLabel) => {
      const decoded = rawLabel.replace(/\\'/g, "'");
      const isCorrect = block.includes('correct: true');
      const repaired = repairLabel(decoded, isCorrect, undefined, undefined);
      if (repaired === decoded) return block;
      count++;
      return block.replace(`label: '${rawLabel}'`, `label: '${repaired.replace(/'/g, "\\'")}'`);
    },
  );
  return { content: updated, count };
}

function processFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const isNative = file.endsWith('practice.ts') && !file.includes('imported');
  const result = isNative ? processNativePractice(file, content) : processJsonBundle(file, content);
  if (result.count) fs.writeFileSync(file, result.content);
  return result.count;
}

const itemsDir = path.join(REPO, 'src/plugins/imported/practice/items');
const nativePractice = fs
  .readdirSync(path.join(REPO, 'src/plugins'))
  .map((d) => path.join(REPO, 'src/plugins', d, 'practice.ts'))
  .filter((f) => fs.existsSync(f));
const files = [
  path.join(REPO, 'src/plugins/imported/practice/migrated.ts'),
  ...fs.readdirSync(itemsDir).filter((f) => f.startsWith('imp-') && f.endsWith('.ts')).map((f) => path.join(itemsDir, f)),
  ...nativePractice,
];

let total = 0;
for (const file of files) total += processFile(file);
console.log(`Repaired ${total} labels across ${files.length} files`);
