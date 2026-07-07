import type { ProblemPlugin } from './types';
import { GROUP_LOADERS, PLUGIN_GROUPS, curatedPlugins, type PluginGroup } from '../plugins';
import { PLUGIN_META, type PluginMetaEntry } from '../plugins/_generated/pluginMeta';

export type { PluginMetaEntry } from '../plugins/_generated/pluginMeta';

// Split registry (#code-split): plugin *metadata* is available synchronously from
// the generated index (catalog / sidebar / search need only this); the heavy plugin
// implementation is loaded on demand, one chunk per group, and memoized.

function normalizePluginId(id: string): string {
  return id.trim().toLowerCase();
}

const metaById = new Map<string, PluginMetaEntry>();
for (const m of PLUGIN_META) {
  const id = normalizePluginId(m.id);
  if (!id) continue;
  if (metaById.has(id)) {
    if (import.meta.env?.DEV) console.warn(`[core/registry] Duplicate plugin id "${m.id}" ignored`);
    continue;
  }
  metaById.set(id, m);
}

/** All plugin metadata (sync). Use for catalogs, sidebars and search. */
export function listPluginMeta(): PluginMetaEntry[] {
  return Array.from(metaById.values());
}

/** One plugin's metadata (sync), or undefined if the id is unknown. */
export function getPluginMeta(id: string): PluginMetaEntry | undefined {
  return metaById.get(normalizePluginId(id));
}

const groupMaps = new Map<PluginGroup, Promise<Map<string, ProblemPlugin<any, any>>>>();

function loadGroup(group: PluginGroup): Promise<Map<string, ProblemPlugin<any, any>>> {
  let pending = groupMaps.get(group);
  if (!pending) {
    pending = GROUP_LOADERS[group]()
      .then((plugins) => {
        const map = new Map<string, ProblemPlugin<any, any>>();
        for (const p of plugins) {
          const id = normalizePluginId(p.meta.id);
          if (id && !map.has(id)) map.set(id, p);
        }
        return map;
      })
      .catch((error) => {
        groupMaps.delete(group);
        throw error;
      });
    groupMaps.set(group, pending);
  }
  return pending;
}

const loaded = new Map<string, ProblemPlugin<any, any>>();
// Curated plugins ship in the entry bundle, so resolve them synchronously — this
// avoids a needless loading flash and lets consumers read them on first render.
for (const p of curatedPlugins) {
  const id = normalizePluginId(p.meta.id);
  if (id && !loaded.has(id)) loaded.set(id, p);
}

/** The full plugin implementation, loading its group's chunk on first use. */
export async function loadPlugin(id: string): Promise<ProblemPlugin<any, any> | undefined> {
  const pluginId = normalizePluginId(id);
  const cached = loaded.get(pluginId);
  if (cached) return cached;
  const meta = metaById.get(pluginId);
  if (!meta) return undefined;
  const map = await loadGroup(meta.group);
  const plugin = map.get(pluginId);
  if (plugin) loaded.set(pluginId, plugin);
  return plugin;
}

/** A plugin only if its group chunk is already loaded (sync, no fetch). */
export function getLoadedPlugin(id: string): ProblemPlugin<any, any> | undefined {
  return loaded.get(normalizePluginId(id));
}

/** Load every plugin across all groups — for tests and tooling only. */
export async function loadAllPlugins(): Promise<ProblemPlugin<any, any>[]> {
  const maps = await Promise.all(PLUGIN_GROUPS.map(loadGroup));
  const all = new Map<string, ProblemPlugin<any, any>>();
  for (const map of maps) for (const [id, p] of map) if (!all.has(id)) all.set(id, p);
  return Array.from(all.values());
}
