/**
 * Exports the frontend learning catalog to a deterministic SQL seed that mirrors
 * it into the Postgres content tables (db/migrations/004_content_schema.sql).
 *
 *   Run:   `npm run export-content-sql`   -> writes db/content_seed.sql
 *   Check: `npm run check-content-sql`    -> fails (exit 1) if the seed is stale
 *
 * TypeScript stays the source of truth; this seed is a downstream artifact, the
 * same pattern as build-plugin-meta.mts. Apply it with:
 *   psql "$DATABASE_URL" -f db/content_seed.sql        (or `make content-seed`)
 *
 * The seed is a single transaction that truncates the content tables and reloads
 * them, so re-running it always converges to exactly the current catalog.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { ProblemPlugin } from '@/core/types';
import { curatedPlugins } from '@/plugins';
import { importedPlugins } from '@/plugins/imported';
import { prepPlugins } from '@/plugins/imported/prep';
import { goCoursePlugins } from '@/plugins/go-course';
import { openrtbPlugins } from '@/plugins/openrtb';
import { catalog } from '@/content';
import { ARCHIPELAGO_REGIONS, PROBLEM_STORY } from '@/plugins/imported/story/archipelago';
import { PREP_DATA } from '@/plugins/imported/prepManifest';

const prepComplexity = new Map(
  PREP_DATA.map((p) => [p.id, { time: p.time ?? null, space: p.space ?? null }]),
);

function parseArgs(argv: string[]): { check: boolean } {
  const options = { check: false };
  for (const arg of argv) {
    if (arg === '--check') options.check = true;
    else {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    }
  }
  return options;
}

function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDifficulty(value: unknown): string {
  return value === 'Easy' || value === 'Hard' ? value : 'Medium';
}

function compactStrings(values: readonly string[] | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values ?? []) {
    const next = cleanText(value).toLowerCase();
    if (!next || seen.has(next)) continue;
    seen.add(next);
    out.push(next);
  }
  return out;
}

type Family = 'DataStructures' | 'Algorithms' | 'Design' | 'Go' | 'Other';

/** Course id -> curriculum family, for the browse/atlas grouping. */
const FAMILY: Record<string, Family> = {
  arrays: 'DataStructures',
  trees: 'DataStructures',
  heaps: 'DataStructures',
  'linked-lists': 'DataStructures',
  'prep-arrays': 'DataStructures',
  'prep-strings': 'DataStructures',
  'prep-hash-maps': 'DataStructures',
  'prep-linked-lists': 'DataStructures',
  'prep-stacks-queues': 'DataStructures',
  'prep-trees': 'DataStructures',
  'prep-tries': 'DataStructures',
  'prep-matrices': 'DataStructures',
  backtracking: 'Algorithms',
  graphs: 'Algorithms',
  'binary-search': 'Algorithms',
  'dynamic-programming': 'Algorithms',
  greedy: 'Algorithms',
  'prep-intervals': 'Algorithms',
  'prep-prefix-sum': 'Algorithms',
  'prep-sliding-window': 'Algorithms',
  'prep-sorting': 'Algorithms',
  'prep-math': 'Algorithms',
  'prep-design': 'Design',
  'prep-streams-io': 'Design',
  'go-senior': 'Go',
  'openrtb-eng': 'Go',
  'prep-database': 'Other',
};

const familyOf = (id: string): Family =>
  FAMILY[id] ??
  (id.startsWith('go')
    ? 'Go'
    : id.startsWith('ortb-') || id.startsWith('openrtb')
      ? 'Go'
      : id.startsWith('prep-')
        ? 'DataStructures'
        : 'Other');

const groupOf = (id: string): string =>
  id === 'go-senior' || id.startsWith('go-')
    ? 'go-course'
    : id === 'openrtb-eng' || id.startsWith('openrtb-') || id.startsWith('ortb-')
      ? 'openrtb'
      : id.startsWith('prep-')
        ? 'prep'
        : 'curated';

// ---- SQL literal helpers (standard single-quote escaping; safe for any text) ----
const q = (v: string | null | undefined): string =>
  v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`;
const num = (n: number | null | undefined): string =>
  typeof n === 'number' && Number.isFinite(n) ? String(Math.trunc(n)) : 'null';
const bool = (b: boolean): string => (b ? 'true' : 'false');
const arr = (a: string[]): string =>
  compactStrings(a).length
    ? `array[${compactStrings(a).map(q).join(',')}]::text[]`
    : `'{}'::text[]`;
const jsonb = (v: unknown): string => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;

// ---- Collect problems from every plugin group (first registration wins) ----
const GROUPS: ProblemPlugin<any, any>[][] = [
  curatedPlugins,
  importedPlugins,
  prepPlugins,
  goCoursePlugins,
  openrtbPlugins,
];

interface SolRow {
  problemId: string;
  lang: string;
  file: string;
  code: string;
  primary: boolean;
  sort: number;
}
interface QRow {
  id: string;
  problemId: string;
  prompt: string;
  explain: string | null;
  sort: number;
}
interface ChoiceRow {
  id: string;
  questionId: string;
  label: string;
  correct: boolean;
  sort: number;
}

const problemRows: {
  id: string;
  title: string;
  difficulty: string;
  summary: string | null;
  source: string | null;
  narrative: string | null;
  region: string | null;
  timeComplexity: string | null;
  spaceComplexity: string | null;
}[] = [];
const solRows: SolRow[] = [];
const quizQRows: QRow[] = [];
const choiceRows: ChoiceRow[] = [];
const tagSet = new Set<string>();
const problemTagRows: { problemId: string; tagId: string }[] = [];
const problemIds = new Set<string>();
const problemTagIds = new Set<string>();

for (const plugins of GROUPS) {
  for (const p of plugins) {
    const m = p.meta;
    const problemId = cleanText(m.id);
    if (!problemId || problemIds.has(problemId)) continue; // dedupe, mirroring the registry
    problemIds.add(problemId);

    const cx = prepComplexity.get(problemId);
    problemRows.push({
      id: problemId,
      title: cleanText(m.title) || problemId,
      difficulty: normalizeDifficulty(m.difficulty),
      summary: cleanText(m.summary) || null,
      source: cleanText(m.source) || null,
      narrative: PROBLEM_STORY[problemId]?.narrative ?? null,
      region: PROBLEM_STORY[problemId]?.regionId ?? null,
      timeComplexity: cx?.time ?? null,
      spaceComplexity: cx?.space ?? null,
    });

    for (const t of compactStrings(m.tags ?? [])) {
      tagSet.add(t);
      const key = `${problemId}::${t}`;
      if (problemTagIds.has(key)) continue;
      problemTagIds.add(key);
      problemTagRows.push({ problemId, tagId: t });
    }

    const codes = [
      ...(p.code ? [{ ...p.code, primary: true }] : []),
      ...(p.extraCode ?? []).map((c) => ({ ...c, primary: false })),
    ];
    const seenSol = new Set<string>();
    codes.forEach((c, i) => {
      const lang = c.lang ?? 'go';
      let file = cleanText(c.file) || 'solution';
      let key = `${lang}::${file}`;
      while (seenSol.has(key)) {
        file = `${file}~${i}`;
        key = `${lang}::${file}`;
      }
      seenSol.add(key);
      solRows.push({ problemId, lang, file, code: c.text, primary: c.primary, sort: i });
    });

    (p.quiz ?? []).forEach((qq, qi) => {
      const qid = `${problemId}::${cleanText(qq.id) || qi}`;
      quizQRows.push({
        id: qid,
        problemId,
        prompt: qq.prompt,
        explain: qq.explain ?? null,
        sort: qi,
      });
      qq.choices.forEach((ch, ci) => {
        choiceRows.push({
          id: `${qid}#${ci}`,
          questionId: qid,
          label: ch.label,
          correct: !!ch.correct,
          sort: ci,
        });
      });
    });
  }
}

// ---- Catalog structure (courses / topics / items) from the assembled catalog ----
const courseRows = catalog.courses.map((c, i) => ({
  id: c.id,
  title: c.title,
  summary: c.summary ?? null,
  icon: c.icon ?? null,
  group: groupOf(c.id),
  family: familyOf(c.id),
  sort: i,
}));

const storyRegionRows = ARCHIPELAGO_REGIONS.map((r) => ({
  id: r.id,
  courseId: r.courseId,
  codeName: r.codeName,
  title: r.title,
  subtitle: r.subtitle,
  blurb: r.blurb,
  sort: r.order,
}));

const topicRows = catalog.courses.flatMap((c) =>
  c.topics.map((t, i) => ({
    id: t.id,
    courseId: c.id,
    title: t.title,
    summary: t.summary ?? null,
    sort: i,
  })),
);

const itemRows = catalog.items.map((it, i) => ({
  id: it.id,
  courseId: it.courseId,
  topicId: it.topicId,
  problemId:
    cleanText(it.pluginId) && problemIds.has(cleanText(it.pluginId))
      ? cleanText(it.pluginId)
      : null,
  kind: it.kind,
  title: it.title ?? null,
  summary: it.summary ?? null,
  difficulty: it.difficulty ?? null,
  estimatedMinutes: it.estimatedMinutes ?? null,
  prereqs: it.prereqs ?? [],
  sort: i,
}));

// ---- Emit SQL ----
const L: string[] = [];
L.push('-- AUTO-GENERATED by scripts/export-content-sql.mts — do not edit by hand.');
L.push('-- Run `npm run export-content-sql` after changing catalog content, then apply with');
L.push('-- `psql "$DATABASE_URL" -f db/content_seed.sql` (or `make content-seed`).');
L.push('');
L.push('begin;');
L.push('');
L.push('truncate public.courses, public.story_regions, public.topics, public.problems,');
L.push('         public.items, public.solutions, public.tags, public.problem_tags,');
L.push('         public.quiz_questions, public.quiz_choices restart identity cascade;');
L.push('');

const insert = (table: string, cols: string, rows: string[]) => {
  if (!rows.length) return;
  L.push(`insert into ${table} (${cols}) values`);
  rows.forEach((r, i) => L.push(`  ${r}${i === rows.length - 1 ? ';' : ','}`));
  L.push('');
};

insert(
  'public.courses',
  'id, title, summary, icon, "group", family, sort_order',
  courseRows.map(
    (c) =>
      `(${q(c.id)}, ${q(c.title)}, ${q(c.summary)}, ${q(c.icon)}, ${q(c.group)}, ${q(c.family)}, ${num(c.sort)})`,
  ),
);

insert(
  'public.story_regions',
  'id, course_id, code_name, title, subtitle, blurb, sort_order',
  storyRegionRows.map(
    (r) =>
      `(${q(r.id)}, ${q(r.courseId)}, ${q(r.codeName)}, ${q(r.title)}, ${q(r.subtitle)}, ${q(r.blurb)}, ${num(r.sort)})`,
  ),
);

insert(
  'public.topics',
  'id, course_id, title, summary, sort_order',
  topicRows.map(
    (t) => `(${q(t.id)}, ${q(t.courseId)}, ${q(t.title)}, ${q(t.summary)}, ${num(t.sort)})`,
  ),
);

insert(
  'public.problems',
  'id, title, difficulty, summary, source_url, region_id, narrative, time_complexity, space_complexity',
  problemRows.map(
    (p) =>
      `(${q(p.id)}, ${q(p.title)}, ${q(p.difficulty)}, ${q(p.summary)}, ${q(p.source)}, ${q(p.region)}, ${q(p.narrative)}, ${q(p.timeComplexity)}, ${q(p.spaceComplexity)})`,
  ),
);

insert(
  'public.tags',
  'id, label',
  [...tagSet].sort().map((t) => `(${q(t)}, ${q(t)})`),
);

insert(
  'public.problem_tags',
  'problem_id, tag_id',
  problemTagRows.map((pt) => `(${q(pt.problemId)}, ${q(pt.tagId)})`),
);

insert(
  'public.solutions',
  'problem_id, language, file, code, is_primary, sort_order',
  solRows.map(
    (s) =>
      `(${q(s.problemId)}, ${q(s.lang)}, ${q(s.file)}, ${q(s.code)}, ${bool(s.primary)}, ${num(s.sort)})`,
  ),
);

insert(
  'public.quiz_questions',
  'id, problem_id, prompt, explain, sort_order',
  quizQRows.map(
    (qq) => `(${q(qq.id)}, ${q(qq.problemId)}, ${q(qq.prompt)}, ${q(qq.explain)}, ${num(qq.sort)})`,
  ),
);

insert(
  'public.quiz_choices',
  'id, question_id, label, is_correct, sort_order',
  choiceRows.map(
    (c) => `(${q(c.id)}, ${q(c.questionId)}, ${q(c.label)}, ${bool(c.correct)}, ${num(c.sort)})`,
  ),
);

insert(
  'public.items',
  'id, course_id, topic_id, problem_id, kind, title, summary, difficulty, estimated_minutes, prereqs, sort_order',
  itemRows.map(
    (it) =>
      `(${q(it.id)}, ${q(it.courseId)}, ${q(it.topicId)}, ${q(it.problemId)}, ${q(it.kind)}, ${q(it.title)}, ${q(it.summary)}, ${q(it.difficulty)}, ${num(it.estimatedMinutes)}, ${arr(it.prereqs)}, ${num(it.sort)})`,
  ),
);

L.push('commit;');
L.push('');

const sql = L.join('\n');

const outPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'content_seed.sql');
const embedPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'backend',
  'db',
  'seeds',
  'content_seed.sql',
);
const { check } = parseArgs(process.argv.slice(2));
const counts =
  `${courseRows.length} courses, ${storyRegionRows.length} story regions, ${topicRows.length} topics, ` +
  `${problemRows.length} problems, ${solRows.length} solutions, ${quizQRows.length} quiz questions, ` +
  `${choiceRows.length} choices, ${itemRows.length} items, ${tagSet.size} tags`;

if (check) {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : null;
  if (current !== sql) {
    console.error('✗ db/content_seed.sql is out of date — run `npm run export-content-sql`.');
    process.exit(1);
  }
  console.log(`✓ content seed up to date (${counts}).`);
} else {
  mkdirSync(dirname(outPath), { recursive: true });
  mkdirSync(dirname(embedPath), { recursive: true });
  writeFileSync(outPath, sql);
  writeFileSync(embedPath, sql);
  console.log(`✓ wrote db/content_seed.sql and backend/db/seeds/content_seed.sql — ${counts}.`);
}
