/** Locate the algo/prep tree for import scripts (no hard-coded sibling repo name). */
import { existsSync, readdirSync } from 'node:fs';
import { join, normalize, resolve } from 'node:path';

function cleanPath(value) {
  return typeof value === 'string' && value.trim() ? resolve(value.trim()) : null;
}

function hasPrepIndex(dir) {
  return existsSync(join(dir, '_index.json'));
}

function hasAlgoTree(dir) {
  return hasPrepIndex(join(dir, 'prep')) || existsSync(join(dir, 'progress'));
}

function siblingPrepCandidates(baseDir) {
  const found = [];
  const base = cleanPath(baseDir);
  if (!base || !existsSync(base)) return found;
  try {
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === 'node_modules') continue;
      const candidate = join(base, entry.name, 'algo', 'prep');
      if (hasPrepIndex(candidate)) found.push(candidate);
    }
  } catch {
    /* unreadable */
  }
  return found;
}

function siblingAlgoCandidates(baseDir) {
  const found = [];
  const base = cleanPath(baseDir);
  if (!base || !existsSync(base)) return found;
  try {
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === 'node_modules') continue;
      const candidate = join(base, entry.name, 'algo');
      if (hasAlgoTree(candidate)) found.push(candidate);
    }
  } catch {
    /* unreadable */
  }
  return found;
}

function uniqueCandidates(candidates) {
  const seen = new Set();
  const out = [];
  for (const candidate of candidates) {
    const key = normalize(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(candidate);
  }
  return out;
}

/**
 * Resolve the directory containing prep/_index.json.
 *
 * Resolution order:
 * 1. PREP_ROOT — path directly to the prep folder
 * 2. ALGO_ROOT — path to algo/ (prep is ALGO_ROOT/prep)
 * 3. ../algo/prep inside the repo (algo-moves/algo/prep)
 * 4. Any sibling repo under the workspace folder (e.g. ../Interview Prep copy/algo/prep)
 */
export function resolvePrepRoot(frontendRoot, env = process.env) {
  const prepRoot = cleanPath(env.PREP_ROOT);
  if (prepRoot && hasPrepIndex(prepRoot)) {
    return { path: prepRoot, via: 'PREP_ROOT' };
  }

  const algoRoot = cleanPath(env.ALGO_ROOT);
  if (algoRoot && hasPrepIndex(join(algoRoot, 'prep'))) {
    return { path: join(algoRoot, 'prep'), via: 'ALGO_ROOT' };
  }

  const repoRoot = resolve(frontendRoot, '..');
  const workspaceRoot = resolve(frontendRoot, '../..');
  const defaultPrep = join(repoRoot, 'algo', 'prep');

  const ordered = uniqueCandidates([
    defaultPrep,
    ...siblingPrepCandidates(workspaceRoot),
    ...siblingPrepCandidates(repoRoot),
  ]);

  for (const candidate of ordered) {
    if (hasPrepIndex(candidate)) {
      if (candidate === defaultPrep) return { path: candidate, via: 'default (../algo/prep)' };
      const label = candidate.includes(workspaceRoot) ? 'workspace sibling' : 'repo sibling';
      return { path: candidate, via: label };
    }
  }

  return { path: defaultPrep, via: 'default (missing)' };
}

/**
 * Resolve the algo/ directory (prep + progress imports).
 * Same env vars as resolvePrepRoot; also scans sibling workspaces for algo/.
 */
export function resolveAlgoRoot(frontendRoot, env = process.env) {
  const algoRoot = cleanPath(env.ALGO_ROOT);
  if (algoRoot && hasAlgoTree(algoRoot)) {
    return { path: algoRoot, via: 'ALGO_ROOT' };
  }

  const prepRoot = cleanPath(env.PREP_ROOT);
  if (prepRoot) {
    const algo = resolve(prepRoot, '..');
    if (hasAlgoTree(algo)) return { path: algo, via: 'PREP_ROOT/..' };
  }

  const repoRoot = resolve(frontendRoot, '..');
  const workspaceRoot = resolve(frontendRoot, '../..');
  const defaultAlgo = join(repoRoot, 'algo');

  const ordered = uniqueCandidates([
    defaultAlgo,
    ...siblingAlgoCandidates(workspaceRoot),
    ...siblingAlgoCandidates(repoRoot),
  ]);

  for (const candidate of ordered) {
    if (hasAlgoTree(candidate)) {
      if (candidate === defaultAlgo) return { path: candidate, via: 'default (../algo)' };
      const label = candidate.includes(workspaceRoot) ? 'workspace sibling' : 'repo sibling';
      return { path: candidate, via: label };
    }
  }

  return { path: defaultAlgo, via: 'default (missing)' };
}
