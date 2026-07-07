import { describe, expect, it } from 'vitest';
import { catalog } from '@/content';
import { recordWorkspaceFrames, resolveWorkspaceRuntimeItem } from './useWorkspaceRuntime';

describe('resolveWorkspaceRuntimeItem', () => {
  it('returns the requested catalog item when it exists', () => {
    const item = catalog.items.find((candidate) => candidate.pluginId) ?? catalog.items[0];
    expect(resolveWorkspaceRuntimeItem(item.id)).toBe(item);
  });

  it('falls back to the first catalog item for stale ids', () => {
    expect(resolveWorkspaceRuntimeItem('__missing__')).toBe(catalog.items[0]);
  });
});

describe('recordWorkspaceFrames', () => {
  const plugin = {
    meta: {
      id: 'demo',
      title: 'Demo',
      difficulty: 'Easy' as const,
      tags: [],
      summary: 'Demo',
    },
    inputs: [{ id: 'sample', label: 'Sample', value: 1 }],
    record: (input: number) => [
      { move: { type: 'demo', note: `${input}`, caption: 'Demo frame' }, state: input },
    ],
    View: () => null,
  };

  it('records frames through a plugin', () => {
    expect(recordWorkspaceFrames(plugin, 3)).toEqual({
      frames: [{ move: { type: 'demo', note: '3', caption: 'Demo frame' }, state: 3 }],
      runtimeError: null,
    });
  });

  it('returns an empty frame set while plugins are unavailable', () => {
    expect(recordWorkspaceFrames(null, 3)).toEqual({ frames: [], runtimeError: null });
    expect(recordWorkspaceFrames(plugin, null)).toEqual({ frames: [], runtimeError: null });
  });

  it('captures recorder failures without throwing', () => {
    const result = recordWorkspaceFrames(
      {
        ...plugin,
        record: () => {
          throw new Error('bad input');
        },
      },
      3,
    );
    expect(result).toEqual({ frames: [], runtimeError: 'bad input' });
  });

  it('reports invalid recorder output as a runtime error', () => {
    expect(recordWorkspaceFrames({ ...plugin, record: () => [] }, 3)).toEqual({
      frames: [],
      runtimeError: 'The preview did not return any frames.',
    });
    expect(recordWorkspaceFrames({ ...plugin, record: () => null as never }, 3)).toEqual({
      frames: [],
      runtimeError: 'The preview returned an invalid frame set.',
    });
  });
});
