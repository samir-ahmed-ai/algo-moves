import { useMemo } from 'react';
import { usePlayer, type Frame, type ProblemPlugin } from '@/core';
import { catalog, type Item } from '@/content';
import { useWorkspacePlugin, useWorkspaceUrlState } from '@/hooks';

export interface WorkspaceFrameResult {
  frames: Frame<any>[];
  runtimeError: string | null;
}

export function resolveWorkspaceRuntimeItem(activeItemId: string): Item {
  const item = catalog.getItem(activeItemId) ?? catalog.items[0];
  if (!item) throw new Error('Catalog has no items');
  return item;
}

export function recordWorkspaceFrames(
  plugin: ProblemPlugin<any, any> | null | undefined,
  input: unknown,
): WorkspaceFrameResult {
  if (!plugin) return { frames: [], runtimeError: null };
  if (input == null && !plugin.meta.static) return { frames: [], runtimeError: null };

  try {
    const frames = plugin.record(input);
    if (!Array.isArray(frames))
      return { frames: [], runtimeError: 'The preview returned an invalid frame set.' };
    if (frames.length === 0)
      return { frames: [], runtimeError: 'The preview did not return any frames.' };
    return { frames, runtimeError: null };
  } catch (error) {
    const detail =
      error instanceof Error && error.message
        ? error.message
        : 'The preview could not be rendered.';
    return { frames: [], runtimeError: detail };
  }
}

export function useWorkspaceRuntime(activeItemId: string) {
  const item = resolveWorkspaceRuntimeItem(activeItemId);
  const { plugin, pluginLoading } = useWorkspacePlugin(item?.pluginId);
  const { inputId, customInput, setCustomInput, selectInput } = useWorkspaceUrlState(
    plugin,
    item.id,
  );

  const input = plugin?.inputs.find((candidate) => candidate.id === inputId) ?? plugin?.inputs[0];
  const effectiveValue = customInput ?? input?.value;
  const { frames, runtimeError } = useMemo(
    () => recordWorkspaceFrames(plugin, effectiveValue),
    [plugin, effectiveValue],
  );
  const player = usePlayer(Math.max(frames.length, 1));
  const frame = frames[player.index] ?? frames[0];

  return {
    item,
    plugin,
    pluginLoading,
    inputId,
    customInput,
    setCustomInput,
    selectInput,
    frames,
    runtimeError,
    player,
    frame,
  };
}
