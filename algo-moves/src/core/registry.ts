import type { ProblemPlugin } from './types';
import { plugins } from '../plugins';

const byId = new Map<string, ProblemPlugin<any, any>>(
  plugins.map((p) => [p.meta.id, p]),
);

export function listPlugins(): ProblemPlugin<any, any>[] {
  return plugins;
}

export function getPlugin(id: string): ProblemPlugin<any, any> | undefined {
  return byId.get(id);
}
