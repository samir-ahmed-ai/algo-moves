import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Recursively collect files under `dir` whose path/name passes `match`.
 * Shared by the check scripts so the directory walk lives in one place.
 *
 * @param {string} dir - directory to walk
 * @param {(path: string, name: string) => boolean} match - keep predicate
 * @param {{ skipDirs?: string[] }} [opts]
 * @returns {string[]}
 */
export function walkFiles(dir, match, { skipDirs = ['node_modules'] } = {}, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (skipDirs.includes(name)) continue;
      walkFiles(p, match, { skipDirs }, out);
    } else if (match(p, name)) {
      out.push(p);
    }
  }
  return out;
}
