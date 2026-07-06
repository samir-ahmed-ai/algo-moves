/** Locate the algo/prep tree for import scripts (no hard-coded sibling repo name). */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function hasPrepIndex(dir) {
  return existsSync(join(dir, '_index.json'));
}

function hasAlgoTree(dir) {
  return hasPrepIndex(join(dir, 'prep')) || existsSync(join(dir, 'progress'));
}

function siblingPrepCandidates(baseDir) {
  const found = [];
  if (!existsSync(baseDir)) return found;
  try {
    for (const entry of readdirSync(baseDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === 'node_modules') continue;
      const candidate = join(baseDir, entry.name, 'algo', 'prep');
      if (hasPrepIndex(candidate)) found.push(candidate);
    }
  } catch {
    /* unreadable */
  }
  return found;
}

function siblingAlgoCandidates(baseDir) {
  const found = [];
  if (!existsSync(baseDir)) return found;
  try {
    for (const entry of readdirSync(baseDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === 'node_modules') continue;
      const candidate = join(baseDir, entry.name, 'algo');
      if (hasAlgoTree(candidate)) found.push(candidate);
    }
  } catch {
    /* unreadable */
  }
  return found;
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
  if (env.PREP_ROOT && hasPrepIndex(env.PREP_ROOT)) {
    return { path: env.PREP_ROOT, via: 'PREP_ROOT' };
  }

  if (env.ALGO_ROOT && hasPrepIndex(join(env.ALGO_ROOT, 'prep'))) {
    return { path: join(env.ALGO_ROOT, 'prep'), via: 'ALGO_ROOT' };
  }

  const repoRoot = join(frontendRoot, '..');
  const workspaceRoot = join(frontendRoot, '../..');
  const defaultPrep = join(repoRoot, 'algo', 'prep');

  const ordered = [
    defaultPrep,
    ...siblingPrepCandidates(workspaceRoot),
    ...siblingPrepCandidates(repoRoot),
  ];

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
  if (env.ALGO_ROOT && hasAlgoTree(env.ALGO_ROOT)) {
    return { path: env.ALGO_ROOT, via: 'ALGO_ROOT' };
  }

  if (env.PREP_ROOT) {
    const algo = join(env.PREP_ROOT, '..');
    if (hasAlgoTree(algo)) return { path: algo, via: 'PREP_ROOT/..' };
  }

  const repoRoot = join(frontendRoot, '..');
  const workspaceRoot = join(frontendRoot, '../..');
  const defaultAlgo = join(repoRoot, 'algo');

  const ordered = [
    defaultAlgo,
    ...siblingAlgoCandidates(workspaceRoot),
    ...siblingAlgoCandidates(repoRoot),
  ];

  for (const candidate of ordered) {
    if (hasAlgoTree(candidate)) {
      if (candidate === defaultAlgo) return { path: candidate, via: 'default (../algo)' };
      const label = candidate.includes(workspaceRoot) ? 'workspace sibling' : 'repo sibling';
      return { path: candidate, via: label };
    }
  }

  return { path: defaultAlgo, via: 'default (missing)' };
}
