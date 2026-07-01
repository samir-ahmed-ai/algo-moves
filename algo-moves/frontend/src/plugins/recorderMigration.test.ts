import { describe, expect, it } from 'vitest';
import type { Frame } from '../core/types';
import { getPlugin } from '../core/registry';

const baselineModules = import.meta.glob<{ sigs: string[] }>('../../scripts/recorder-baselines/*.json', {
  eager: true,
  import: 'default',
});

const BASELINES: Record<string, string[]> = Object.fromEntries(
  Object.entries(baselineModules).map(([file, data]) => {
    const slug = file.split('/').pop()!.replace('.json', '');
    return [slug, data.sigs];
  }),
);

const REGRESSION_SLUGS: { slug: string; pluginId: string }[] = [
  { slug: 'basic-calculator', pluginId: 'prep-stacks-queues-basic-calculator' },
  { slug: 'find-single-number', pluginId: 'prep-math-find-single-number' },
  { slug: 'powx-n', pluginId: 'prep-math-powx-n' },
  { slug: 'fizzbuzz', pluginId: 'prep-math-fizzbuzz' },
  { slug: 'exclusive-time-of-functions', pluginId: 'prep-design-exclusive-time-of-functions' },
  { slug: 'two-sum', pluginId: 'prep-arrays-two-sum' },
];

function frameStateSig(frame: Frame): string {
  const s = frame.state ?? {};
  const keys = Object.keys(s).sort();
  const vals = keys.map((k) => {
    const v = (s as Record<string, unknown>)[k];
    if (v === null) return `${k}:null`;
    if (typeof v === 'boolean' || typeof v === 'number' || typeof v === 'string') return `${k}:${v}`;
    if (Array.isArray(v)) return `${k}:[${v.length}]`;
    return `${k}:obj`;
  });
  return `${frame.move.type}|${vals.join(',')}`;
}

function validateFrameStates(frames: Frame[]): void {
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    expect(f.move?.type, `frame ${i}: missing move.type`).toBeTruthy();
    expect(f.state, `frame ${i}: missing state`).toBeDefined();
  }
  const last = frames[frames.length - 1];
  if (last?.move?.type === 'DONE') {
    const st = last.state as Record<string, unknown>;
    expect(st.done === true || st.finished === true, 'last DONE frame missing done/finished:true').toBe(true);
    if ('answer' in st) {
      expect(st.answer, 'last DONE frame has answer:null').not.toBeNull();
    }
  }
}

describe('recorder migration regression', () => {
  for (const { slug, pluginId } of REGRESSION_SLUGS) {
    it(`${slug} produces valid DONE frames and matches baseline`, () => {
      const plugin = getPlugin(pluginId);
      expect(plugin, `missing plugin ${pluginId}`).toBeDefined();
      for (const input of plugin!.inputs) {
        const frames = plugin!.record(input.value);
        expect(frames.length).toBeGreaterThan(0);
        validateFrameStates(frames);
      }
      const frames = plugin!.record(plugin!.inputs[0]!.value);
      const sigs = frames.map(frameStateSig);
      const baseline = BASELINES[slug];
      expect(baseline, `missing baseline for ${slug} — run: npm run verify-recorder-migration -- --write-baseline`).toBeDefined();
      expect(sigs).toEqual(baseline);
    });
  }
});
