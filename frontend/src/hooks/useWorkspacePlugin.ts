import { useEffect, useState } from 'react';
import { loadPlugin, getLoadedPlugin, type ProblemPlugin } from '@/core';

/**
 * Resolves the heavy plugin implementation for a problem, loading its group's chunk
 * on demand (#code-split). Metadata is already available synchronously for the
 * catalog/sidebar; only the canvas needs the full plugin, so this returns a loading
 * flag while the chunk fetches. Extracted from Workspace.
 */
export function useWorkspacePlugin(pluginId: string | undefined) {
  const [plugin, setPlugin] = useState<ProblemPlugin<any, any> | undefined>(() =>
    pluginId ? getLoadedPlugin(pluginId) : undefined,
  );
  const [pluginLoading, setPluginLoading] = useState(false);

  useEffect(() => {
    if (!pluginId) {
      setPlugin(undefined);
      setPluginLoading(false);
      return;
    }
    const cached = getLoadedPlugin(pluginId);
    if (cached) {
      setPlugin(cached);
      setPluginLoading(false);
      return;
    }
    setPlugin(undefined);
    setPluginLoading(true);
    let cancelled = false;
    loadPlugin(pluginId).then((p) => {
      if (cancelled) return;
      setPlugin(p);
      setPluginLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [pluginId]);

  return { plugin, pluginLoading };
}
