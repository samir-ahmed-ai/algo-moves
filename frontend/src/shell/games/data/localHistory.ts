import { readStorageJson, writeStorageJson } from '@/store/persistence';
import { STORAGE_KEYS } from '@/store/storageKeys';

export interface LocalMatchRecord {
  id: string;
  gameId: string;
  date: string;
  myName: string;
  myScore: number;
  placement: number;
  totalPlayers: number;
  opponents: { name: string; score: number; placement: number }[];
}

export interface LocalLeaderboardRow {
  rank: number;
  name: string;
  wins: number;
  losses: number;
  matchesPlayed: number;
}

const MAX_HISTORY = 100;

function isLocalMatchRecord(value: unknown): value is LocalMatchRecord {
  if (!value || typeof value !== 'object') return false;
  const row = value as LocalMatchRecord;
  return (
    typeof row.id === 'string' &&
    typeof row.gameId === 'string' &&
    typeof row.date === 'string' &&
    typeof row.myName === 'string' &&
    typeof row.placement === 'number'
  );
}

function isLocalMatchRecordArray(value: unknown): value is LocalMatchRecord[] {
  if (!Array.isArray(value)) return false;
  return value.every(isLocalMatchRecord);
}

function readAll(): LocalMatchRecord[] {
  return readStorageJson<LocalMatchRecord[]>(
    STORAGE_KEYS.GAMES_LOCAL_HISTORY,
    [],
    isLocalMatchRecordArray,
  );
}

export function saveLocalMatch(record: LocalMatchRecord): void {
  const next = [record, ...readAll()].slice(0, MAX_HISTORY);
  writeStorageJson(STORAGE_KEYS.GAMES_LOCAL_HISTORY, next);
}

export function getLocalHistory(limit?: number): LocalMatchRecord[] {
  const rows = readAll();
  return limit ? rows.slice(0, limit) : rows;
}

export function clearLocalHistory(): void {
  writeStorageJson(STORAGE_KEYS.GAMES_LOCAL_HISTORY, []);
}

export function buildLocalLeaderboard(opts?: {
  gameId?: string | null;
  since?: Date;
}): LocalLeaderboardRow[] {
  let rows = readAll();
  if (opts?.gameId) rows = rows.filter((row) => row.gameId === opts.gameId);
  if (opts?.since) {
    const sinceMs = opts.since.getTime();
    rows = rows.filter((row) => new Date(row.date).getTime() >= sinceMs);
  }

  const totals = new Map<string, { wins: number; losses: number; matches: number }>();
  for (const row of rows) {
    const cur = totals.get(row.myName) ?? { wins: 0, losses: 0, matches: 0 };
    cur.matches += 1;
    if (row.placement === 1) cur.wins += 1;
    else cur.losses += 1;
    totals.set(row.myName, cur);
  }

  return [...totals.entries()]
    .sort((a, b) => b[1].wins - a[1].wins || b[1].matches - a[1].matches)
    .map(([name, stats], index) => ({
      rank: index + 1,
      name,
      wins: stats.wins,
      losses: stats.losses,
      matchesPlayed: stats.matches,
    }));
}
