import type { ProblemPlugin } from './types';
import { plugins } from '../plugins';

const byId = new Map<string, ProblemPlugin<any, any>>();
for (const p of plugins) {
  if (byId.has(p.meta.id)) {
    if (import.meta.env.DEV) {
      // Keep first registration and warn so duplicates don't silently shadow values.
      console.warn(`[core/registry] Duplicate plugin id "${p.meta.id}" ignored`);
    }
    continue;
  }
  byId.set(p.meta.id, p);
}

export function listPlugins(): ProblemPlugin<any, any>[] {
  return Array.from(byId.values());
}

export function getPlugin(id: string): ProblemPlugin<any, any> | undefined {
  return byId.get(id);
}
