#!/usr/bin/env node
/**
 * Reads db/migrations/010_games_catalog.sql and emits canonical game id constants
 * for the frontend registry. Run: node scripts/generate-game-ids.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const sqlPath = join(root, '..', 'db/migrations/010_games_catalog.sql');
const outPath = join(root, 'src/shell/games/_generated/gameIds.ts');

const sql = readFileSync(sqlPath, 'utf8');
const insertMatch = sql.match(/insert into public\.games[^;]+values\s*([\s\S]*?)\s*on conflict/i);
if (!insertMatch) {
  console.error('Could not parse games catalog from', sqlPath);
  process.exit(1);
}

const rows = [];
const rowRe = /\(\s*'([^']+)'\s*,\s*'((?:[^']|'')*)'\s*,\s*(\d+)\s*\)/g;
for (const chunk of insertMatch[1].split('\n')) {
  let m;
  while ((m = rowRe.exec(chunk)) !== null) {
    rows.push({
      id: m[1],
      title: m[2].replace(/''/g, "'"),
      sortOrder: Number(m[3]),
    });
  }
}

function fail(message) {
  console.error(`generate-game-ids: ${message}`);
  process.exit(1);
}

if (rows.length === 0) fail(`no game rows found in ${sqlPath}`);

const seenIds = new Set();
const seenSortOrders = new Set();
for (const row of rows) {
  if (!/^[a-z][a-z0-9-]*$/.test(row.id)) {
    fail(`invalid game id "${row.id}"`);
  }
  if (!row.title.trim()) {
    fail(`missing title for game id "${row.id}"`);
  }
  if (seenIds.has(row.id)) {
    fail(`duplicate game id "${row.id}"`);
  }
  if (seenSortOrders.has(row.sortOrder)) {
    fail(`duplicate sort order ${row.sortOrder}`);
  }
  seenIds.add(row.id);
  seenSortOrders.add(row.sortOrder);
}

rows.sort((a, b) => a.sortOrder - b.sortOrder);

const toConstName = (id) =>
  id
    .split('-')
    .map((part) => part.toUpperCase())
    .join('_');

const constLines = rows.map(
  (r) => `export const GAME_ID_${toConstName(r.id)} = '${r.id}' as const;`,
);
const idUnion = rows.map((r) => `  | '${r.id}'`).join('\n');
const catalogEntries = rows
  .map(
    (r) =>
      `  { id: GAME_ID_${toConstName(r.id)}, title: ${JSON.stringify(r.title)}, sortOrder: ${r.sortOrder} },`,
  )
  .join('\n');

const out = `/** Generated from db/migrations/010_games_catalog.sql — do not edit. */
${constLines.join('\n')}

export type GameId =
${idUnion};

export const GAME_IDS = [
${rows.map((r) => `  GAME_ID_${toConstName(r.id)},`).join('\n')}
] as const satisfies readonly GameId[];

export const GAME_CATALOG = [
${catalogEntries}
] as const;
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, out);
console.log(`Wrote ${outPath} (${rows.length} games)`);
