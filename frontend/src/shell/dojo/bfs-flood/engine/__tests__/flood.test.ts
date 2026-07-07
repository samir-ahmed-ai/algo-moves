import { describe, expect, it } from 'vitest';
import {
  LEVELS,
  LEVEL_IDS,
  NEIGHBOR_ORDER,
  createState,
  expandAt,
  expandHead,
  getLevel,
  isComplete,
  maxDistance,
  nextLevelId,
  parseGrid,
  referenceDistances,
  simulateOptimal,
  type FloodState,
  type ParsedGrid,
} from '../flood';

/** Drains the queue completely (past star completion) — full flood ground truth. */
function fullFlood(parsed: ParsedGrid): { state: FloodState; maxQueue: number } {
  let state = createState(parsed);
  let maxQueue = state.queue.length;
  while (state.queue.length > 0) {
    const result = expandHead(parsed, state);
    if (!result.ok) throw new Error(`drain stalled: ${result.reason}`);
    state = result.state;
    maxQueue = Math.max(maxQueue, state.queue.length);
  }
  return { state, maxQueue };
}

describe('parseGrid', () => {
  it('reads walls, sources (reading order), star and floor count', () => {
    const parsed = parseGrid(['S.#', '.*S']);
    expect(parsed.rows).toBe(2);
    expect(parsed.cols).toBe(3);
    expect(parsed.walls[0]).toEqual([false, false, true]);
    expect(parsed.sources).toEqual([
      { r: 0, c: 0 },
      { r: 1, c: 2 },
    ]);
    expect(parsed.star).toEqual({ r: 1, c: 1 });
    expect(parsed.floorCount).toBe(5);
  });

  it('rejects malformed grids', () => {
    expect(() => parseGrid(['S.......'])).toThrow(/7/); // 8 cols
    expect(() => parseGrid(['S.', '.'])).toThrow(/wide/);
    expect(() => parseGrid(['...'])).toThrow(/no source/);
    expect(() => parseGrid(['S?'])).toThrow(/unknown grid char/);
    expect(() => parseGrid(['S**'])).toThrow(/more than one star/);
  });
});

describe('neighbor order', () => {
  it('is documented as N, E, S, W', () => {
    expect(NEIGHBOR_ORDER).toEqual([
      { r: -1, c: 0 },
      { r: 0, c: 1 },
      { r: 1, c: 0 },
      { r: 0, c: -1 },
    ]);
  });

  it('appends discoveries to the tail in N, E, S, W order', () => {
    const parsed = parseGrid(['...', '.S.', '...']);
    const result = expandHead(parsed, createState(parsed));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.discoveredCells).toEqual([
      { r: 0, c: 1 }, // N
      { r: 1, c: 2 }, // E
      { r: 2, c: 1 }, // S
      { r: 1, c: 0 }, // W
    ]);
    expect(result.state.queue).toEqual(result.discoveredCells);
    for (const cell of result.discoveredCells) {
      expect(result.state.dist[cell.r]![cell.c]).toBe(1);
    }
  });

  it('skips walls, bounds and already-discovered cells', () => {
    const parsed = parseGrid(['#S', '..']);
    const first = expandHead(parsed, createState(parsed));
    expect(first.ok && first.discoveredCells).toEqual([{ r: 1, c: 1 }]); // E,W blocked; S only
    if (!first.ok) return;
    const second = expandHead(parsed, first.state);
    expect(second.ok && second.discoveredCells).toEqual([{ r: 1, c: 0 }]);
  });
});

describe('expandAt validity', () => {
  const parsed = parseGrid(['S..']);

  it('only position 1 (the head, oldest discovery) is legal', () => {
    const state = createState(parsed);
    const afterHead = expandHead(parsed, state);
    expect(afterHead.ok).toBe(true);
    expect(expandAt(parsed, state, 2)).toEqual({ ok: false, reason: 'outOfRange' });
  });

  it('flags a later frontier pick as notHead without mutating state', () => {
    const open = parseGrid(['S.', '..']);
    const r1 = expandHead(open, createState(open));
    if (!r1.ok) throw new Error('expand failed');
    const state = r1.state; // queue: [(0,1) E, (1,0) S]
    expect(state.queue).toHaveLength(2);
    const snapshot = JSON.parse(JSON.stringify(state));
    expect(expandAt(open, state, 2)).toEqual({ ok: false, reason: 'notHead' });
    expect(state).toEqual(snapshot);
    expect(expandAt(open, state, 3)).toEqual({ ok: false, reason: 'outOfRange' });
    expect(expandAt(open, state, 0)).toEqual({ ok: false, reason: 'outOfRange' });
  });

  it('reports an empty queue', () => {
    const { state } = fullFlood(parsed);
    expect(expandAt(parsed, state, 1)).toEqual({ ok: false, reason: 'empty' });
  });
});

describe('levels', () => {
  it('exposes exactly the five registry level ids in order', () => {
    expect(LEVEL_IDS).toEqual(['bf-01', 'bf-02', 'bf-03', 'bf-04', 'bf-05']);
    expect(nextLevelId('bf-04')).toBe('bf-05');
    expect(nextLevelId('bf-05')).toBeNull();
    expect(getLevel('bf-03')?.title).toBe('The bent path');
  });

  it.each(LEVELS.map((lv) => [lv.id, lv] as const))('%s parses within 7×7', (_id, lv) => {
    const parsed = parseGrid(lv.grid);
    expect(parsed.rows).toBeLessThanOrEqual(7);
    expect(parsed.cols).toBeLessThanOrEqual(7);
  });

  it('bf-01/03/05 have a star; bf-02/04 flood fully without one', () => {
    for (const lv of LEVELS) {
      const parsed = parseGrid(lv.grid);
      expect(parsed.star != null).toBe(['bf-01', 'bf-03', 'bf-05'].includes(lv.id));
    }
  });

  it.each(LEVELS.map((lv) => [lv.id, lv] as const))(
    '%s playthrough distances match the reference BFS everywhere',
    (_id, lv) => {
      const parsed = parseGrid(lv.grid);
      const { state } = fullFlood(parsed);
      expect(state.dist).toEqual(referenceDistances(parsed));
      expect(state.discovered).toBe(parsed.floorCount); // every level fully floodable
    },
  );

  it.each(LEVELS.map((lv) => [lv.id, lv] as const))(
    '%s queue never exceeds 9 through a full optimal playthrough',
    (_id, lv) => {
      expect(simulateOptimal(lv).maxQueue).toBeLessThanOrEqual(9);
      // Even draining past completion stays within the 1–9 key range.
      expect(fullFlood(parseGrid(lv.grid)).maxQueue).toBeLessThanOrEqual(9);
    },
  );

  it.each(LEVELS.map((lv) => [lv.id, lv] as const))(
    '%s par is achievable by the optimal head-only run',
    (_id, lv) => {
      expect(simulateOptimal(lv).expansions).toBeLessThanOrEqual(lv.par);
    },
  );

  it('optimal action counts are pinned (7, 12, 12, 12, 16)', () => {
    expect(LEVELS.map((lv) => simulateOptimal(lv).expansions)).toEqual([7, 12, 12, 12, 16]);
  });
});

describe('star-discovery completion', () => {
  it.each(['bf-01', 'bf-03', 'bf-05'])(
    '%s completes the moment the star is discovered, at its reference distance',
    (id) => {
      const lv = getLevel(id)!;
      const parsed = parseGrid(lv.grid);
      const ref = referenceDistances(parsed);
      const starDist = ref[parsed.star!.r]![parsed.star!.c]!;
      expect(starDist).toBeGreaterThan(0);

      let state = createState(parsed);
      let expansions = 0;
      while (!isComplete(parsed, state)) {
        expect(state.starDiscovered).toBe(false);
        const result = expandHead(parsed, state);
        if (!result.ok) throw new Error('stalled');
        state = result.state;
        expansions++;
      }
      expect(state.starDiscovered).toBe(true);
      expect(state.dist[parsed.star!.r]![parsed.star!.c]).toBe(starDist);
      expect(expansions).toBe(simulateOptimal(lv).expansions);
      expect(simulateOptimal(lv).starDistance).toBe(starDist);
      // Frontier cells may remain — discovery, not full flood, ends the level.
      expect(state.discovered).toBeLessThanOrEqual(parsed.floorCount);
    },
  );

  it('bf-01 star distance is 7 — the corridor is the shortest (only) path', () => {
    expect(simulateOptimal(getLevel('bf-01')!).starDistance).toBe(7);
  });

  it('bf-03 walls bend the shortest path to 12', () => {
    expect(simulateOptimal(getLevel('bf-03')!).starDistance).toBe(12);
  });
});

describe('starless full-flood completion', () => {
  it.each(['bf-02', 'bf-04'])('%s completes when every reachable cell is discovered', (id) => {
    const lv = getLevel(id)!;
    const parsed = parseGrid(lv.grid);
    let state = createState(parsed);
    while (!isComplete(parsed, state)) {
      const result = expandHead(parsed, state);
      if (!result.ok) throw new Error('stalled');
      state = result.state;
    }
    expect(state.discovered).toBe(parsed.floorCount);
  });
});

describe('multi-source seeding (bf-04)', () => {
  it('seeds BOTH springs at distance 0, in reading order', () => {
    const parsed = parseGrid(getLevel('bf-04')!.grid);
    expect(parsed.sources).toEqual([
      { r: 0, c: 0 },
      { r: 2, c: 5 },
    ]);
    const state = createState(parsed);
    expect(state.queue).toEqual(parsed.sources);
    expect(state.dist[0]![0]).toBe(0);
    expect(state.dist[2]![5]).toBe(0);
    expect(state.discovered).toBe(2);
  });

  it('labels every cell with the distance to the NEAREST spring', () => {
    const parsed = parseGrid(getLevel('bf-04')!.grid);
    const ref = referenceDistances(parsed);
    for (let r = 0; r < parsed.rows; r++) {
      for (let c = 0; c < parsed.cols; c++) {
        const manhattan = Math.min(r + c, Math.abs(r - 2) + Math.abs(c - 5));
        expect(ref[r]![c]).toBe(manhattan); // open grid → Manhattan distance
      }
    }
    expect(maxDistance(ref)).toBe(3);
  });
});
