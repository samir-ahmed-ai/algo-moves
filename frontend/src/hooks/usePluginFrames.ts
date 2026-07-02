import { useMemo } from 'react';
import { usePlayer } from '@/core';
import type { ProblemPlugin } from '@/core/types';

/**
 * Runs a plugin's recorder for one input and drives it with a Player.
 *
 * Centralizes the `record → usePlayer → current-frame` wiring shared by the mobile
 * viz shell and the canvas stage. Pass an explicit `input` to visualize a specific
 * case; defaults to the plugin's first input.
 */
export function usePluginFrames(plugin: ProblemPlugin, input?: ProblemPlugin['inputs'][number]) {
  const chosen = input ?? plugin.inputs[0];
  const baseFrames = useMemo(
    () => (chosen ? plugin.record(chosen.value) : []),
    [plugin, chosen],
  );
  const player = usePlayer(Math.max(baseFrames.length, 1));
  const frame = baseFrames[player.index] ?? baseFrames[0];
  return { input: chosen, baseFrames, player, frame, ready: baseFrames.length > 0 };
}
