#!/usr/bin/env node
/**
 * Generate algorithm-specific practice quizzes for prep simulators from each
 * file's emit() captions + prepManifest metadata, then inject into the simulator export.
 *
 * Usage:
 *   node scripts/generate-prep-practice-quiz.mjs [--dry-run] [--topic trees]
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPrepManifestIds } from './lib/prepCoverage.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(root, 'src/plugins/imported/prepManifest.ts');
const simDir = join(root, 'src/plugins/imported/prepSimulators/problems');

function parseArgs(argv) {
  const options = { dryRun: false, topic: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--topic') {
      options.topic = argv[++i]?.trim() || null;
      if (!options.topic) throw new Error('--topic requires a topic id');
    } else {
      throw new Error(`unknown option: ${arg}`);
    }
  }
  return options;
}

const { dryRun, topic: topicFilter } = parseArgs(process.argv.slice(2));

const COMPLEXITY_POOL = [
  'O(1)',
  'O(log n)',
  'O(n)',
  'O(n log n)',
  'O(n²)',
  'O(n³)',
  'O(2ⁿ)',
  'O(m·n)',
  'O(m+n)',
];

const GENERIC_DETAILS = new Set([
  'plausible distractor',
  'typical bound here',
  'typical for this pattern',
  'short rationale',
  'wrong approach here',
]);
const BAD_HEADLINE_END =
  /\b(have|has|had|are|is|was|were|been|a|an|the|no|at|on|in|to|for|with|by|from|that|when|where|if|so|as|may|would|could|should|can|will|be|of|and|or|not|its|it|dequeued|being|each|all|before|after|into|only|just|also|still|un)\s*$/i;

function hashSeed(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function seededOrder(items, seed) {
  return items
    .map((item, i) => ({ item, k: Math.imul(seed + i, 2654435761) >>> 0 }))
    .sort((a, b) => a.k - b.k)
    .map(({ item }) => item);
}

function truncateWords(s, maxWords) {
  const words = s.replace(/\s+/g, ' ').trim().split(' ');
  if (words.length <= maxWords) return words.join(' ');
  return words.slice(0, maxWords).join(' ');
}

function truncateChars(s, max) {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.lastIndexOf(' ', max - 1);
  return (cut > 8 ? t.slice(0, cut) : t.slice(0, max)).trim();
}

function quizLabelIssues(label) {
  const trimmed = label.trim();
  if (trimmed.length > 72) return 'label exceeds 72 chars';
  if (/,\s*—/.test(trimmed)) return 'comma-split before dash';
  const match = trimmed.match(/^(.+?)\s+[—–]\s+(.+)$/);
  if (!match) return 'missing detail clause after em dash';
  const headline = match[1].trim();
  const detail = match[2].trim();
  if (headline.includes('…')) return 'truncated headline';
  if (GENERIC_DETAILS.has(detail.toLowerCase())) return `generic detail: ${detail}`;
  if (BAD_HEADLINE_END.test(headline)) return `bad headline end: ${headline}`;
  if (/\w…/.test(trimmed)) return 'mid-word truncation';
  return null;
}

function sanitizeHeadline(s) {
  let h = s
    .replace(/\$\{[^}]+\}/g, '')
    .replace(/…/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  h = truncateChars(h, 42);
  for (let i = 0; i < 4 && BAD_HEADLINE_END.test(h); i++) {
    const words = h.split(' ');
    if (words.length <= 2) break;
    h = words.slice(0, -1).join(' ');
  }
  if (BAD_HEADLINE_END.test(h)) {
    h = truncateChars(h.replace(/[,;:]+$/, ''), 38);
  }
  return h || 'Alternate interpretation';
}

function mkChoice(headline, detail, correct) {
  let h = sanitizeHeadline(headline);
  let d = truncateChars(detail.replace(/[,;:]+$/, ''), 28);
  h = h.replace(/,\s*$/, '');
  let label = `${h} — ${d}`;
  if (label.length > 72) {
    d = truncateChars(d, 72 - h.length - 3);
    label = `${h} — ${d}`;
  }
  if (label.length > 72) {
    h = truncateChars(h, 72 - d.length - 3);
    label = `${h} — ${d}`;
  }
  let issue = quizLabelIssues(label);
  if (issue) {
    h = sanitizeHeadline(`${h} step`);
    label = `${h} — ${d}`;
    issue = quizLabelIssues(label);
  }
  if (issue) {
    const safe = correct ? 'Matches recorder caption' : 'Wrong interpretation';
    label = `${sanitizeHeadline(safe)} — ${d}`;
  }
  return { label, ...(correct ? { correct: true } : {}) };
}

function parsePrepData() {
  const raw = readFileSync(manifestPath, 'utf8');
  const m = raw.match(/export const PREP_DATA[^=]*=\s*(\[[\s\S]*\]);/);
  if (!m) throw new Error('Could not parse prepManifest.ts');
  const allowedIds = new Set(readPrepManifestIds(manifestPath));
  return JSON.parse(m[1]).filter((entry) => allowedIds.has(entry.id));
}

function parseEmits(src) {
  const emits = [];
  const re = /emit\s*\(\s*['"](\w+)['"]\s*,\s*`([^`]*)`\s*,\s*`([^`]*)`/g;
  let m;
  while ((m = re.exec(src))) {
    emits.push({ type: m[1], note: m[2], caption: m[3] });
  }
  return emits;
}

function parseStateFields(src) {
  const iface = src.match(/interface\s+\w+State\s*\{([\s\S]*?)\n\}/);
  if (!iface) return [];
  const fields = [];
  for (const line of iface[1].split('\n')) {
    const fm = line.match(/^\s*(\w+)\??\s*:/);
    if (fm) fields.push(fm[1]);
  }
  return fields;
}

function parseStateComments(src) {
  const iface = src.match(/interface\s+\w+State\s*\{([\s\S]*?)\n\}/);
  if (!iface) return {};
  const comments = {};
  for (const line of iface[1].split('\n')) {
    const fm = line.match(/^\s*(\w+)\??\s*:.*?\/\/\s*(.+)$/);
    if (fm) comments[fm[1]] = fm[2].trim();
  }
  return comments;
}

function pickDistractors(correct, pool, count, seed) {
  const candidates = [...new Set(pool.map((v) => v.trim()).filter((v) => v && v !== correct))];
  return seededOrder(candidates, seed).slice(0, count);
}

function buildPatternChoices(pattern, pool, seed) {
  const distractors = pickDistractors(pattern, pool, 3, seed);
  return [
    mkChoice(pattern, 'fits this problem', true),
    ...distractors.map((d) => mkChoice(d, 'different approach', false)),
  ];
}

function buildComplexityChoices(entry, peers, seed) {
  const correct = `${entry.time} time, ${entry.space || 'O(1)'} space`;
  const pool = [
    ...new Set([
      ...peers.map((p) => `${p.time} time, ${p.space || 'O(1)'} space`),
      ...COMPLEXITY_POOL.map((t) => `${t} time, O(n) space`),
    ]),
  ];
  const distractors = pickDistractors(correct, pool, 3, seed + 7);
  return [
    mkChoice(correct, 'standard bounds here', true),
    ...distractors.map((d) => mkChoice(d, 'wrong order of growth', false)),
  ];
}

function generateQuiz(entry, simSrc) {
  const seed = hashSeed(entry.id);
  const emits = parseEmits(simSrc);
  const stateFields = parseStateFields(simSrc);
  const stateComments = parseStateComments(simSrc);
  const topicPeers = PREP_DATA.filter((s) => s.topic === entry.topic && s.id !== entry.id);
  const patternPool = topicPeers.map((s) => s.pattern);

  const init = emits.find((e) => e.type === 'INIT');
  const done = emits.find((e) => e.type === 'DONE') ?? emits[emits.length - 1];
  const midSteps = emits.filter((e) => e.type !== 'INIT' && e.type !== 'DONE');
  const keyStep = midSteps[Math.floor(midSteps.length / 2)] ?? midSteps[0];

  const questions = [];

  if (entry.pattern) {
    questions.push({
      id: 'pattern',
      prompt: `Which approach fits "${entry.title}"?`,
      choices: buildPatternChoices(entry.pattern, patternPool, seed),
      explain: entry.visual || entry.pattern,
    });
  }

  if (init) {
    const strategyHeadline = truncateWords(
      (entry.visual || init.caption).replace(/\$\{[^}]+\}/g, ''),
      6,
    );
    questions.push({
      id: 'init',
      prompt: `At the start of a run (${entry.title}), what strategy is established?`,
      choices: [
        mkChoice(strategyHeadline, 'described in INIT caption', true),
        mkChoice('Precomputed final answer', 'before scanning input', false),
        mkChoice('Descending sort required', 'as mandatory first step', false),
        mkChoice('Every element visited upfront', 'marked from the start', false),
      ],
      explain: init.caption.replace(/\$\{[^}]+\}/g, ''),
    });
  }

  if (keyStep) {
    const stepHeadline = truncateWords(keyStep.caption.replace(/\$\{[^}]+\}/g, ''), 6);
    questions.push({
      id: 'key-step',
      prompt: `On the "${keyStep.type}" step (${keyStep.note.replace(/\$\{[^}]+\}/g, '')}), what happens?`,
      choices: [
        mkChoice(stepHeadline, 'this move caption', true),
        mkChoice('Run terminates immediately', 'no further frames', false),
        mkChoice('Pointers reset to zero', 'restart scan', false),
        mkChoice('Remaining input skipped', 'early return path', false),
      ],
      explain: keyStep.caption.replace(/\$\{[^}]+\}/g, ''),
    });
  }

  const field =
    stateFields.find((f) => !['done', 'op', 'cap'].includes(f) && stateComments[f]) ??
    stateFields.find((f) => !['done', 'op'].includes(f)) ??
    stateFields[0];

  if (field) {
    const comment = stateComments[field]?.replace(/\$\{[^}]+\}/g, '');
    const headline = comment ? truncateWords(comment, 5) : `Field ${field} in state`;
    questions.push({
      id: 'state',
      prompt: `What does the \`${field}\` field track in the visualization state?`,
      choices: [
        mkChoice(headline, 'updated each frame', true),
        mkChoice('Fixed display label', 'unchanged each frame', false),
        mkChoice('Shuffle seed value', 'for random ordering', false),
        mkChoice('Failure error code', 'set once at end', false),
      ],
      explain: comment
        ? `The recorder keeps \`${field}\` in sync: ${comment}`
        : `The recorder snapshots \`${field}\` on every emit so each frame shows the algorithm mid-step.`,
    });
  }

  if (entry.time) {
    questions.push({
      id: 'complexity',
      prompt: `What are the time and space complexities for "${entry.title}"?`,
      choices: buildComplexityChoices(entry, topicPeers, seed),
      explain: [entry.time, entry.space, entry.memorize].filter(Boolean).join('. '),
    });
  }

  if (done) {
    const outcomeHeadline = truncateWords(done.caption.replace(/\$\{[^}]+\}/g, ''), 6);
    questions.push({
      id: 'outcome',
      prompt: `When the run completes, what does the final step convey?`,
      choices: [
        mkChoice(outcomeHeadline, 'final DONE caption', true),
        mkChoice('Incomplete partial result', 'more steps needed', false),
        mkChoice('Input left unchanged', 'no mutations applied', false),
        mkChoice('Aborted run on failure', 'infinite loop detected', false),
      ],
      explain: done.caption.replace(/\$\{[^}]+\}/g, ''),
    });
  }

  return questions.slice(0, 6);
}

function validateQuiz(entryId, quiz) {
  const issues = [];
  for (const q of quiz) {
    for (const c of q.choices) {
      const issue = quizLabelIssues(c.label);
      if (issue) issues.push(`${entryId} · ${q.id}: ${c.label} (${issue})`);
    }
  }
  return issues;
}

function serializeQuiz(quiz) {
  return JSON.stringify(quiz, null, 2)
    .replace(/"correct": true/g, 'correct: true')
    .replace(/"(\w+)":/g, '$1:');
}

function ensureQuizImport(src) {
  if (/type QuizQuestion/.test(src)) {
    return src
      .replace(
        /\nimport type \{ QuizQuestion \} from '\.\.\/\.\.\/\.\.\/\.\.\/core\/types';\n/,
        '\n',
      )
      .replace(/import \{ ([^}]+) \} from '\.\.\/\.\.\/\.\.\/\.\.\/core\/types';/, (m, types) => {
        if (types.includes('QuizQuestion')) {
          return `import { ${types.replace(/\s+,/g, ',').replace(/,\s+/g, ', ').trim()} } from '../../../../core/types';`;
        }
        return `import { ${types.trim()}, type QuizQuestion } from '../../../../core/types';`;
      });
  }
  return src.replace(
    /import \{ ([^}]+) \} from '\.\.\/\.\.\/\.\.\/\.\.\/core\/types';/,
    (m, types) => `import { ${types.trim()}, type QuizQuestion } from '../../../../core/types';`,
  );
}

function stripExistingPractice(src) {
  return src
    .replace(/\nconst practiceQuiz: QuizQuestion\[\] = \[[\s\S]*?\];\n/g, '\n')
    .replace(/\n  practice: \{ quiz: practiceQuiz \},\n/g, '\n');
}

function injectPractice(src, quiz) {
  let out = stripExistingPractice(src);
  out = ensureQuizImport(out);

  const quizBlock = `\nconst practiceQuiz: QuizQuestion[] = ${serializeQuiz(quiz)};\n`;

  const simMatch = out.match(/export const simulator: ProblemSimulator = \{/);
  if (!simMatch) throw new Error('Could not find simulator export');

  const insertAt = simMatch.index;
  out = out.slice(0, insertAt) + quizBlock + out.slice(insertAt);

  out = out.replace(
    /export const simulator: ProblemSimulator = \{\n/,
    'export const simulator: ProblemSimulator = {\n  practice: { quiz: practiceQuiz },\n',
  );

  return out;
}

const PREP_DATA = parsePrepData();
const byId = Object.fromEntries(PREP_DATA.map((e) => [e.id, e]));

let updated = 0;
let skipped = 0;
const allIssues = [];

for (const name of readdirSync(simDir)
  .filter((n) => n.endsWith('.tsx'))
  .sort()) {
  const path = join(simDir, name);
  const src = readFileSync(path, 'utf8');
  const idMatch = src.match(/manifestId\s*=\s*['"]([^'"]+)['"]/);
  if (!idMatch) {
    console.warn(`skip ${name}: no manifestId`);
    skipped++;
    continue;
  }
  const entry = byId[idMatch[1]];
  if (!entry) {
    console.warn(`skip ${name}: unknown manifest id ${idMatch[1]}`);
    skipped++;
    continue;
  }
  if (topicFilter && entry.topic !== topicFilter) continue;

  const quiz = generateQuiz(entry, src);
  const issues = validateQuiz(entry.id, quiz);
  if (issues.length) {
    allIssues.push(...issues);
    console.warn(`label issues in ${name}:`);
    for (const i of issues.slice(0, 4)) console.warn(`  ${i}`);
  }

  const next = injectPractice(src, quiz);
  if (!dryRun) writeFileSync(path, next);
  updated++;
}

console.log(
  `generate-prep-practice-quiz: ${updated} file(s)${dryRun ? ' (dry-run)' : ''}${skipped ? `, ${skipped} skipped` : ''}`,
);
if (allIssues.length) {
  console.warn(`total label issues: ${allIssues.length} (first 8):`);
  for (const i of allIssues.slice(0, 8)) console.warn(`  ${i}`);
  process.exit(1);
}
