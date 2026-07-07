import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function readPrepManifestIds(manifestPath) {
  const raw = readFileSync(manifestPath, 'utf8');
  const jsonMatch = raw.match(/export const PREP_DATA[^=]*=\s*(\[[\s\S]*\]);/);
  if (!jsonMatch) throw new Error(`Could not parse ${manifestPath}`);

  const parsed = JSON.parse(jsonMatch[1]);
  if (!Array.isArray(parsed)) throw new Error(`Prep manifest is not an array: ${manifestPath}`);

  const seen = new Set();
  const ids = [];
  for (const entry of parsed) {
    const id = typeof entry?.id === 'string' ? entry.id.trim() : '';
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export function readPrepSimulatorSources(simDir) {
  return readdirSync(simDir)
    .sort()
    .filter((name) => name.endsWith('.tsx'))
    .map((name) => ({
      name,
      source: readFileSync(join(simDir, name), 'utf8'),
    }));
}

export function simulatorManifestId(source) {
  const match = source.match(/manifestId\s*=\s*['"]([^'"]+)['"]/);
  return match?.[1]?.trim() || null;
}

export function collectPrepSimulatorIds(simDir, predicate = () => true) {
  const ids = new Set();
  for (const { name, source } of readPrepSimulatorSources(simDir)) {
    const id = simulatorManifestId(source);
    if (id && predicate(source, id, name)) ids.add(id);
  }
  return ids;
}

export function missingPrepIds(ids, coveredIds) {
  return ids.filter((id) => !coveredIds.has(id));
}
