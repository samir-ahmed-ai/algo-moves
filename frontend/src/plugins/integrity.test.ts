import { describe, expect, it } from 'vitest';
import { loadAllPlugins, getPluginMeta } from '../core/registry';
import { PLUGIN_META } from './_generated/pluginMeta';
import { GENERATED_PROBLEM_BRIEFS } from '@/content/_generated/problemBriefs';
import { quizLabelIssues, quizCorrectnessIssues } from '@/lib/quiz';
import { defaultPrepQuiz } from './imported/prepQuiz';
import { PREP_DATA } from './imported/prepManifest';
import { curatedCourses } from '../content/courses';
import { buildCatalog } from '../content/catalog';
import { mergeCourses } from '../content/mergeCourses';
import { importedCourses } from './imported';
import { prepCourses } from './imported/prep';
import { IMPORTED_DATA } from './imported/manifest';
import { resolveSimulator } from './imported/simulators';
import { SIMULATED_CATEGORIES } from './imported/factory';
import { resolvePracticeBundle } from './imported/practice';
import { PROBLEM_GLYPHS } from '../content/glyphs';

// Load every plugin's implementation once (all group chunks) for the integrity checks.
const plugins = await loadAllPlugins();
const pluginById = new Map(plugins.map((p) => [p.meta.id, p]));

const BUILTIN_PANELS = new Set([
  'workbench',
  'replay',
  'inspector',
  'metrics',
  'bigo',
  'predict',
  'mastery',
  'mistakes',
  'explain',
  'badges',
  'bookmarks',
  'editor',
  'pattern',
  'glossary',
  'diff',
  'watch',
  'hints',
  'path',
  'cheatsheet',
  'projects',
  'notes',
  'complexity',
  'edgecases',
  'code',
  'scratch',
  'copy',
]);

function curatedPluginIds(): string[] {
  const ids: string[] = [];
  for (const course of curatedCourses) {
    for (const topic of course.topics) {
      for (const item of topic.items) {
        if (item.kind === 'problem' && item.pluginId) ids.push(item.pluginId);
      }
    }
  }
  return ids;
}

function panelIds(plugin: (typeof plugins)[0]): Set<string> {
  const ids = new Set(BUILTIN_PANELS);
  for (const tab of plugin.tabs ?? []) ids.add(tab.id);
  return ids;
}

describe('catalog ↔ registry integrity', () => {
  const catalog = buildCatalog([...mergeCourses(curatedCourses, importedCourses), ...prepCourses]);

  it('every curated catalog pluginId resolves in the registry', () => {
    for (const id of curatedPluginIds()) {
      expect(getPluginMeta(id), `missing plugin for curated pluginId "${id}"`).toBeDefined();
    }
  });

  it('every catalog item pluginId resolves', () => {
    for (const item of catalog.items) {
      if (item.kind === 'problem' && item.pluginId) {
        expect(getPluginMeta(item.pluginId), `missing plugin for item "${item.id}"`).toBeDefined();
      }
    }
  });
});

describe('generated plugin meta is in sync with implementations', () => {
  // Guards against editing a plugin's meta without re-running `npm run build-plugin-meta`.
  // The generated PLUGIN_META is a direct copy of each plugin's meta fields + group,
  // so any drift here means the checked-in generated index is stale.
  it('every plugin implementation has a matching generated meta entry', () => {
    const drift: string[] = [];
    for (const p of plugins) {
      const gen = getPluginMeta(p.meta.id);
      if (!gen) {
        drift.push(`${p.meta.id}: no generated meta entry — run npm run build-plugin-meta`);
        continue;
      }
      if (gen.title !== p.meta.title)
        drift.push(`${p.meta.id}: title "${gen.title}" ≠ "${p.meta.title}"`);
      if (gen.difficulty !== p.meta.difficulty)
        drift.push(`${p.meta.id}: difficulty "${gen.difficulty}" ≠ "${p.meta.difficulty}"`);
      if (gen.summary !== p.meta.summary) drift.push(`${p.meta.id}: summary drift`);
      if ((gen.source ?? undefined) !== (p.meta.source ?? undefined))
        drift.push(`${p.meta.id}: source drift`);
      if (JSON.stringify(gen.tags) !== JSON.stringify(p.meta.tags))
        drift.push(`${p.meta.id}: tags drift`);
    }
    expect(drift, drift.join('\n')).toEqual([]);
  });

  it('no generated meta entry is orphaned', () => {
    const orphans = PLUGIN_META.filter((m) => !pluginById.has(m.id)).map((m) => m.id);
    expect(orphans, `orphaned meta entries (no loadable plugin): ${orphans.join(', ')}`).toEqual(
      [],
    );
  });

  it('every plugin has a generated problem brief', () => {
    const missing = PLUGIN_META.filter((m) => !GENERATED_PROBLEM_BRIEFS[m.id]).map((m) => m.id);
    expect(
      missing,
      `missing briefs — run npm run build-problem-briefs: ${missing.join(', ')}`,
    ).toEqual([]);
  });
});

describe('plugin wires reference valid panel ids', () => {
  for (const plugin of plugins) {
    if (!plugin.wires) continue;
    it(`${plugin.meta.id} wires endpoints exist`, () => {
      const ids = panelIds(plugin);
      for (const [mode, edges] of Object.entries(plugin.wires ?? {})) {
        for (const [src, tgt] of edges) {
          expect(ids.has(src), `${plugin.meta.id} ${mode} wire src "${src}"`).toBe(true);
          expect(ids.has(tgt), `${plugin.meta.id} ${mode} wire tgt "${tgt}"`).toBe(true);
        }
      }
    });
  }
});

describe('curated course plugins have learn stack', () => {
  const CURATED_FULL_STACK = new Set(curatedPluginIds());

  for (const id of CURATED_FULL_STACK) {
    it(`${id} has quiz or practice tabs`, () => {
      const p = pluginById.get(id);
      expect(p).toBeDefined();
      const hasQuiz = (p!.quiz?.length ?? 0) > 0;
      const hasPracticeTabs = (p!.tabs ?? []).some(
        (t) => t.mode === 'practice' || t.mode === 'learn',
      );
      expect(hasQuiz || hasPracticeTabs, `${id} missing learn stack`).toBe(true);
    });
  }
});

describe('move.note is present on every frame', () => {
  for (const plugin of plugins) {
    for (const input of plugin.inputs) {
      it(`${plugin.meta.id} · "${input.label}" frames have move.note`, () => {
        const frames = plugin.record(input.value);
        for (const f of frames) {
          expect(typeof f.move.note).toBe('string');
          expect(f.move.note.length).toBeGreaterThan(0);
        }
      });
    }
  }
});

describe('imported simulators resolve by manifest id', () => {
  for (const p of IMPORTED_DATA) {
    if (!SIMULATED_CATEGORIES.has(p.category)) continue;
    it(`${p.id} resolves a simulator`, () => {
      expect(resolveSimulator(p.id, p.title, p.category), p.id).toBeDefined();
    });
  }
});

describe('curated plugin ids have glyph keys', () => {
  for (const id of curatedPluginIds()) {
    it(`${id} has PROBLEM_GLYPHS entry`, () => {
      expect(PROBLEM_GLYPHS[id], `missing glyph for ${id}`).toBeTruthy();
    });
  }
});

/** Imported ids in curated courses with simulators should expose at least one hand case. */
const CASE_EXCEPTIONS = new Set<string>([]);

const simulatorSources = import.meta.glob<string>('./imported/simulators/problems/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const prepSimulatorSources = import.meta.glob<string>('./imported/prepSimulators/problems/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const prepSceneSource = import.meta.glob<string>('./imported/prepScene.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
})['./imported/prepScene.tsx'];

const nativeSources = import.meta.glob<string>('./*/index.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const factorySource = import.meta.glob<string>('./imported/factory.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
})['./imported/factory.tsx'];

function usesAbsolutePosition(src: string): boolean {
  return /position:\s*['"]absolute['"]/.test(src);
}

function hasMinWidthConstraint(src: string): boolean {
  return /\bminWidth\b/.test(src) || /\bmin-width\b/.test(src);
}

describe('visualizer View structure', () => {
  for (const plugin of plugins) {
    it(`${plugin.meta.id} defines View`, () => {
      expect(plugin.View).toBeDefined();
    });
  }

  for (const [path, src] of Object.entries(simulatorSources)) {
    const file = path.split('/').pop() ?? path;
    it(`simulator ${file} View uses board-area`, () => {
      expect(src, file).toMatch(/className="board-area|(<VizStage)|(<ArrayPatternView)/);
      if (usesAbsolutePosition(src)) {
        expect(hasMinWidthConstraint(src), `${file} absolute layout needs minWidth`).toBe(true);
      }
    });
  }

  for (const plugin of plugins) {
    // imp-*, prep-*, go-* and ortb-* are factory-generated (View lives in factory/prepScene/sim files), not folder plugins.
    if (
      plugin.meta.id.startsWith('imp-') ||
      plugin.meta.id.startsWith('prep-') ||
      plugin.meta.id.startsWith('go-') ||
      plugin.meta.id.startsWith('ortb-')
    )
      continue;
    const nativePath = `./${plugin.meta.id}/index.tsx`;
    it(`native ${plugin.meta.id} View uses board-area`, () => {
      const src = nativeSources[nativePath];
      expect(src, plugin.meta.id).toBeDefined();
      expect(src!, plugin.meta.id).toMatch(/className="board-area|(<VizStage)|(<ArrayPatternView)/);
      if (usesAbsolutePosition(src!)) {
        expect(
          hasMinWidthConstraint(src!),
          `${plugin.meta.id} absolute layout needs minWidth`,
        ).toBe(true);
      }
    });
  }

  for (const [path, src] of Object.entries(prepSimulatorSources)) {
    const file = path.split('/').pop() ?? path;
    it(`prep simulator ${file} View uses board-area`, () => {
      expect(src, file).toMatch(/className="board-area|(<VizStage)|(<ArrayPatternView)/);
      if (usesAbsolutePosition(src)) {
        expect(hasMinWidthConstraint(src), `${file} absolute layout needs minWidth`).toBe(true);
      }
    });
  }

  it('ConceptView fallback uses board-area', () => {
    expect(factorySource).toBeDefined();
    expect(factorySource!).toMatch(/className="board-area/);
  });

  it('SceneView fallback uses board-area', () => {
    expect(prepSceneSource).toBeDefined();
    expect(prepSceneSource!).toMatch(/className="board-area/);
  });
});

describe('quiz choice labels use headline — detail format', () => {
  const bad: string[] = [];
  for (const plugin of plugins) {
    for (const q of plugin.quiz ?? []) {
      for (const c of q.choices) {
        const issue = quizLabelIssues(c.label);
        if (issue) bad.push(`${plugin.meta.id} · ${q.id}: ${c.label} (${issue.reason})`);
      }
    }
  }
  it('every plugin quiz choice has quality headline — detail labels', () => {
    expect(bad, bad.slice(0, 12).join('\n')).toEqual([]);
  });
});

describe('defaultPrepQuiz labels', () => {
  const bad: string[] = [];
  for (const p of PREP_DATA) {
    for (const q of defaultPrepQuiz(p)) {
      for (const c of q.choices) {
        const issue = quizLabelIssues(c.label);
        if (issue) bad.push(`${p.id} · ${q.id}: ${c.label} (${issue.reason})`);
      }
    }
  }
  it('auto-generated prep quiz choices meet label quality rules', () => {
    expect(bad, bad.slice(0, 8).join('\n')).toEqual([]);
  });
});

describe('quiz correctness', () => {
  const bad: string[] = [];
  for (const plugin of plugins) {
    for (const q of plugin.quiz ?? []) {
      for (const issue of quizCorrectnessIssues(q)) {
        bad.push(`${plugin.meta.id} · ${q.id}: ${issue}`);
      }
    }
  }
  for (const p of PREP_DATA) {
    if (pluginById.get(p.id)?.quiz?.length) continue;
    for (const q of defaultPrepQuiz(p)) {
      for (const issue of quizCorrectnessIssues(q)) {
        bad.push(`${p.id} · ${q.id}: ${issue}`);
      }
    }
  }
  it('every quiz question has exactly one correct choice and unique labels', () => {
    expect(bad, bad.slice(0, 12).join('\n')).toEqual([]);
  });
});

describe('prep simulator quality', () => {
  const bad: string[] = [];
  for (const plugin of plugins) {
    if (!plugin.meta.id.startsWith('prep-')) continue;
    for (const input of plugin.inputs) {
      const frames = plugin.record(input.value);
      const tag = `${plugin.meta.id} · "${input.label}"`;
      if (frames.length === 0) {
        bad.push(`${tag}: empty recording`);
        continue;
      }
      if (frames.length < 3) {
        bad.push(`${tag}: only ${frames.length} frame(s), need >= 3`);
      }
      const v = plugin.verdict?.(frames);
      if (v && (typeof v.ok !== 'boolean' || typeof v.label !== 'string')) {
        bad.push(`${tag}: verdict shape invalid`);
      }
    }
  }
  it('prep simulators emit >= 3 frames with terminal DONE or verdict', () => {
    expect(bad, bad.slice(0, 12).join('\n')).toEqual([]);
  });
});

function stateImpliesVerdictOk(state: Record<string, unknown> | undefined): boolean | null {
  if (!state) return null;
  if ('result' in state) {
    const r = state.result;
    if (r === null || r === undefined || r === false) return false;
    if (Array.isArray(r)) return r.length > 0;
    return true;
  }
  if (typeof state.done === 'boolean' && 'hit' in state) {
    return state.done === true && state.hit !== null && state.hit !== undefined;
  }
  if (typeof state.found === 'boolean') return state.found;
  return null;
}

/** Prep simulators whose final state exposes a checkable result field. */
const VERDICT_SAMPLE_IDS = new Set([
  'prep-arrays-two-sum',
  'prep-arrays-find-duplicate-number',
  'prep-linked-lists-detect-loop',
  'prep-linked-lists-reverse-linked-list',
  'prep-stacks-queues-validate-parentheses',
  'prep-strings-min-window-substring',
  'prep-strings-longest-substring-with-unique',
  'prep-trees-binary-tree-maximum-path-sum',
  'prep-intervals-merge-intervals',
  'prep-hash-maps-find-top-k-frequent-elements',
]);

describe('verdict truthfulness sampling', () => {
  const bad: string[] = [];
  for (const plugin of plugins) {
    if (!VERDICT_SAMPLE_IDS.has(plugin.meta.id)) continue;
    for (const input of plugin.inputs) {
      const frames = plugin.record(input.value);
      const v = plugin.verdict?.(frames);
      if (!v) {
        bad.push(`${plugin.meta.id} · "${input.label}": missing verdict`);
        continue;
      }
      const expected = stateImpliesVerdictOk(
        frames[frames.length - 1]?.state as Record<string, unknown>,
      );
      if (expected !== null && v.ok !== expected) {
        bad.push(`${plugin.meta.id} · "${input.label}": verdict.ok=${v.ok} expected ${expected}`);
      }
    }
  }
  it('sampled prep simulators verdict.ok matches terminal state oracle', () => {
    expect(bad, bad.join('\n')).toEqual([]);
  });
});

describe('curated imported simulators have hand cases', () => {
  const curated = new Set(curatedPluginIds().filter((id) => id.startsWith('imp-')));
  for (const p of IMPORTED_DATA) {
    if (!curated.has(p.id) || !SIMULATED_CATEGORIES.has(p.category)) continue;
    it(`${p.id} has cases.good or documented exception`, () => {
      if (CASE_EXCEPTIONS.has(p.id)) return;
      const bundle = resolvePracticeBundle(p.id, p.code);
      expect((bundle?.cases?.good.length ?? 0) >= 1, p.id).toBe(true);
    });
  }
});
