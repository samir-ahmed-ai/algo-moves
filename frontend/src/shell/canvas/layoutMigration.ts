import type { LayoutEntry } from '@/store/canvas-layout';
import { DOCK_ONLY_PANELS } from './layout';

// Pure migrations for persisted canvas layouts. Extracted from CanvasStage so the
// legacy-format upgrades stay unit-testable and out of the render component.

/** Migrate legacy separate inspector node into the merged viz node; strip dock-only panels. */
export function migrateVisualizeLayoutEntry(entry: LayoutEntry): LayoutEntry {
  const inspector = entry.nodes.inspector;
  const alreadyRemoved = entry.removed.includes('inspector');
  let nodes = { ...entry.nodes };
  let removed = [...entry.removed];

  if (inspector) {
    const viz = nodes.viz;
    if (viz) {
      nodes.viz = {
        ...viz,
        width: (viz.width ?? 680) + (inspector.width ?? 400),
      };
    }
    delete nodes.inspector;
    if (!alreadyRemoved) removed.push('inspector');
  } else if (alreadyRemoved) {
    // keep removed as-is
  }

  for (const id of DOCK_ONLY_PANELS) {
    if (nodes[id]) {
      delete nodes[id];
      if (!removed.includes(id)) removed.push(id);
    }
  }

  // Migrate legacy split examples panel into unified problem panel.
  if (nodes.examples && !nodes.problem) {
    nodes.problem = nodes.examples;
  }
  delete nodes.examples;
  if (!removed.includes('examples')) removed.push('examples');

  return { nodes, removed };
}

/** Migrate legacy code+scratch layouts to unified Code Studio. */
export function migrateCodeLayoutEntry(entry: LayoutEntry): LayoutEntry {
  const scratch = entry.nodes.scratch;
  if (!scratch) return entry;
  const nodes = { ...entry.nodes };
  if (nodes.code) {
    nodes.code = {
      ...nodes.code,
      width: Math.max(nodes.code.width ?? 0, scratch.width ?? 0) || nodes.code.width,
    };
  } else {
    nodes.code = scratch;
  }
  delete nodes.scratch;
  const removed = entry.removed.includes('scratch') ? entry.removed : [...entry.removed, 'scratch'];
  return { nodes, removed };
}

export function mergeLearnLayoutEntries(a: LayoutEntry, b?: LayoutEntry): LayoutEntry {
  const nodes = { ...a.nodes };
  if (b) {
    for (const [id, saved] of Object.entries(b.nodes)) {
      if (id === 'code' && nodes.code) {
        nodes.code = {
          ...nodes.code,
          width: Math.max(nodes.code.width ?? 0, saved.width ?? 0) || saved.width,
        };
      } else if (id === 'code' || !nodes[id]) {
        nodes[id] = saved;
      }
    }
  }
  const removed = [...new Set([...a.removed, ...(b?.removed ?? [])])];
  return { nodes, removed };
}

export function stripLayoutHeights(entry: LayoutEntry): LayoutEntry {
  const nodes: LayoutEntry['nodes'] = {};
  for (const [id, saved] of Object.entries(entry.nodes)) {
    const { height: _, ...rest } = saved;
    nodes[id] = rest;
  }
  return { ...entry, nodes };
}

export function migrateLayouts(stored: Record<string, LayoutEntry>): Record<string, LayoutEntry> {
  const temp: Record<string, LayoutEntry> = {};
  for (const [key, entry] of Object.entries(stored)) {
    let migrated = entry;
    if (key.endsWith(':code') || key.endsWith(':practice') || key.endsWith(':learn')) {
      migrated = migrateCodeLayoutEntry(migrated);
    } else if (key.endsWith(':visualize')) {
      migrated = migrateVisualizeLayoutEntry(migrated);
    }
    temp[key] = stripLayoutHeights(migrated);
  }

  const out: Record<string, LayoutEntry> = {};
  const mergedPlugins = new Set<string>();

  for (const key of Object.keys(temp)) {
    if (!key.endsWith(':practice') && !key.endsWith(':code')) continue;
    const pluginId = key.slice(0, key.lastIndexOf(':'));
    if (mergedPlugins.has(pluginId)) continue;
    mergedPlugins.add(pluginId);
    const practice = temp[`${pluginId}:practice`];
    const code = temp[`${pluginId}:code`];
    const existingLearn = temp[`${pluginId}:learn`];
    let learn: LayoutEntry = practice && code
      ? mergeLearnLayoutEntries(practice, code)
      : practice ?? code ?? existingLearn!;
    if (existingLearn) learn = mergeLearnLayoutEntries(learn, existingLearn);
    out[`${pluginId}:learn`] = learn;
  }

  for (const [key, entry] of Object.entries(temp)) {
    if (key.endsWith(':practice') || key.endsWith(':code')) continue;
    if (key.endsWith(':learn') && mergedPlugins.has(key.slice(0, key.lastIndexOf(':')))) continue;
    out[key] = entry;
  }

  return out;
}
