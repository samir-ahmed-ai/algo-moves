import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolvePrepRoot, resolveAlgoRoot } from '../../scripts/resolve-algo-path.mjs';

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('resolve-algo-path', () => {
  it('resolvePrepRoot returns a prep directory with _index.json when algo is available', () => {
    const { path, via } = resolvePrepRoot(frontendRoot);
    expect(via).not.toBe('default (missing)');
    expect(existsSync(join(path, '_index.json'))).toBe(true);
  });

  it('resolveAlgoRoot returns algo with prep or progress', () => {
    const { path, via } = resolveAlgoRoot(frontendRoot);
    expect(via).not.toBe('default (missing)');
    const hasPrep = existsSync(join(path, 'prep', '_index.json'));
    const hasProgress = existsSync(join(path, 'progress'));
    expect(hasPrep || hasProgress).toBe(true);
  });

  it('PREP_ROOT env overrides discovery', () => {
    const { path } = resolvePrepRoot(frontendRoot);
    const { path: forced, via } = resolvePrepRoot(frontendRoot, { PREP_ROOT: path });
    expect(forced).toBe(path);
    expect(via).toBe('PREP_ROOT');
  });
});
