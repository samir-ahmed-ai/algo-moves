import { describe, it, expect } from 'vitest';
import { VIM_LEVELS } from '../levels';
import {
  applyMotion,
  isWalkable,
  type MazeGrid,
  type MotionSpec,
  type Pos,
  type VimMotionKind,
} from '../vimMotions';

function gridFromLevel(level: (typeof VIM_LEVELS)[0]): MazeGrid {
  return level.grid.map((row) => row.replace(/@/g, '.'));
}

function posEq(a: Pos, b: Pos) {
  return a[0] === b[0] && a[1] === b[1];
}

function allMotionsForLevel(allowed: VimMotionKind[]): MotionSpec[] {
  const specs: MotionSpec[] = [];
  for (const kind of allowed) {
    if (kind === 'nG') {
      for (let n = 1; n <= 6; n++) specs.push({ kind: 'nG', count: n });
    } else if (['f', 'F', 't', 'T'].includes(kind)) {
      for (const ch of 'abcdefghijklmnopqrstuvwxyz') {
        specs.push({ kind: kind as 'f' | 'F' | 't' | 'T', count: 1, char: ch });
      }
    } else {
      specs.push({ kind, count: 1 });
      if (['h', 'j', 'k', 'l'].includes(kind)) specs.push({ kind, count: 2 });
    }
  }
  return specs;
}

function bfsReachGoal(grid: MazeGrid, start: Pos, goal: Pos, allowed: VimMotionKind[]): boolean {
  const motions = allMotionsForLevel(allowed);
  const startKey = `${start[0]},${start[1]}`;
  const seen = new Set<string>([startKey]);
  const queue: Pos[] = [start];

  while (queue.length) {
    const cur = queue.shift()!;
    if (posEq(cur, goal)) return true;
    for (const motion of motions) {
      const next = applyMotion(grid, cur, motion);
      if (!next) continue;
      const key = `${next[0]},${next[1]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return false;
}

describe('VIM_LEVELS', () => {
  it('has valid start and goal on walkable cells', () => {
    for (const level of VIM_LEVELS) {
      const grid = gridFromLevel(level);
      expect(isWalkable(grid, level.start[0], level.start[1])).toBe(true);
      expect(isWalkable(grid, level.goal[0], level.goal[1])).toBe(true);
    }
  });

  it('each level is reachable with allowed motions', () => {
    for (const level of VIM_LEVELS) {
      const grid = gridFromLevel(level);
      const ok = bfsReachGoal(grid, level.start, level.goal, level.allowed);
      expect(ok, `level ${level.id} should be solvable`).toBe(true);
    }
  });
});
