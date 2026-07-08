import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolvePrepRoot, resolveAlgoRoot } from '../../scripts/resolve-algo-path.mjs';

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const fixtureAlgo = join(frontendRoot, 'test-fixtures/resolve-algo-path');
const fixturePrep = join(fixtureAlgo, 'prep');

describe('resolve-algo-path', () => {
  it('resolvePrepRoot returns a prep directory with _index.json when algo is available', () => {
    const { path, via } = resolvePrepRoot(frontendRoot, { ALGO_ROOT: fixtureAlgo });
    expect(via).toBe('ALGO_ROOT');
    expect(path).toBe(fixturePrep);
    expect(existsSync(join(path, '_index.json'))).toBe(true);
  });

  it('resolveAlgoRoot returns algo with prep or progress', () => {
    const { path, via } = resolveAlgoRoot(frontendRoot, { ALGO_ROOT: fixtureAlgo });
    expect(via).toBe('ALGO_ROOT');
    const hasPrep = existsSync(join(path, 'prep', '_index.json'));
    const hasProgress = existsSync(join(path, 'progress'));
    expect(hasPrep || hasProgress).toBe(true);
  });

  it('PREP_ROOT env overrides discovery', () => {
    const { path: forced, via } = resolvePrepRoot(frontendRoot, { PREP_ROOT: fixturePrep });
    expect(forced).toBe(fixturePrep);
    expect(via).toBe('PREP_ROOT');
  });
});
