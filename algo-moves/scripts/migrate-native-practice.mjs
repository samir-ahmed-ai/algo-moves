#!/usr/bin/env node
/** Merge native plugin practice/cases into imported practice bundles for canonical migration. */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const MAP = [
  ['climbing-stairs', 'imp-58-climbing-stairs'],
  ['edit-distance', 'imp-61-edit-distance'],
  ['subsets', 'imp-26-subsets'],
  ['number-of-islands', 'imp-24-number-of-islands'],
  ['course-schedule', 'imp-20-course-schedule'],
  ['is-bipartite', 'imp-7-is-graph-bipartite'],
  ['dijkstra', 'imp-6-find-shortest-path-with-dijkstra-s'],
  ['topological-sort', 'imp-0-08-topological-sort-with-dfs'],
];

const bundles = {};

for (const [folder, manifestId] of MAP) {
  const base = `../src/plugins/${folder}`;
  let practice = {};
  let cases = {};
  try {
    practice = await import(join(root, `src/plugins/${folder}/practice.ts`));
  } catch { /* no practice */ }
  try {
    cases = await import(join(root, `src/plugins/${folder}/cases.ts`));
  } catch { /* no cases */ }

  const bundle = {};
  if (practice.codePieces) bundle.codePieces = practice.codePieces;
  if (practice.quiz) bundle.quiz = practice.quiz;
  const good = cases.goodCases ?? cases.good;
  const bad = cases.badCases ?? cases.bad;
  if (good?.length) {
    const normalized = good.map((c) => {
      if (c.adj && !c.input) {
        return {
          id: c.id,
          title: c.title,
          input: { adj: c.adj },
          inputLabel: c.inputLabel ?? `adj (${c.adj.length} nodes)`,
          question: c.question,
          answer: c.answer,
          returns: c.returns,
          tone: c.tone,
        };
      }
      return c;
    });
    const normalizedBad = bad?.map((c) => {
      if (c.adj && !c.input) {
        return {
          id: c.id,
          title: c.title,
          input: { adj: c.adj },
          inputLabel: c.inputLabel ?? `adj (${c.adj.length} nodes)`,
          question: c.question,
          answer: c.answer,
          returns: c.returns,
          tone: c.tone ?? 'bad',
        };
      }
      return c;
    });
    bundle.cases = {
      good: normalized,
      bad: normalizedBad?.length ? normalizedBad : undefined,
      goodLabel: cases.goodLabel,
      badLabel: cases.badLabel,
      intro: cases.intro,
    };
  }
  if (folder === 'binary-search') bundle.simulateQuestion = 'Which half does binary search keep next?';
  if (folder === 'climbing-stairs') bundle.simulateQuestion = 'Which dp cell is filled next?';
  if (folder === 'dijkstra') bundle.simulateQuestion = 'Which node does Dijkstra relax next?';
  if (folder === 'is-bipartite') bundle.simulateQuestion = 'Which node gets colored next?';
  if (folder === 'topological-sort') bundle.simulateQuestion = 'Which node is peeled off next?';
  if (folder === 'course-schedule') bundle.simulateQuestion = 'Which course is taken off the queue next?';
  if (folder === 'number-of-islands') bundle.simulateQuestion = 'Which cell does the flood fill visit next?';
  if (folder === 'edit-distance') bundle.simulateQuestion = 'Which dp cell is filled next?';
  if (folder === 'subsets') bundle.simulateQuestion = 'What choice does backtracking make next?';

  bundles[manifestId] = bundle;
}

const out = `import type { PracticeBundle } from '../../_shared/pluginKit';

/** Teaching content migrated from native curated plugins (now imported-canonical). */
export const MIGRATED_BUNDLES: Record<string, PracticeBundle> = ${JSON.stringify(bundles, null, 2)};
`;

writeFileSync(join(root, 'src/plugins/imported/practice/migrated.ts'), out);
console.log(`Wrote migrated bundles for ${Object.keys(bundles).length} problems.`);
