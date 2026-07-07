/**
 * Production Hocuspocus server — persists Yjs binary state to Postgres.
 *
 * Railway: binds to $PORT. Local dev: HOCUSPOCUS_PORT (default 1234).
 */
import { Database } from '@hocuspocus/extension-database';
import { Logger } from '@hocuspocus/extension-logger';
import { Server } from '@hocuspocus/server';
import pg from 'pg';

const port = Number(process.env.PORT ?? process.env.HOCUSPOCUS_PORT ?? 1234);
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('[hocuspocus] DATABASE_URL unset — documents will not persist across restarts');
}

const pool = databaseUrl
  ? new pg.Pool({
      connectionString: databaseUrl,
      max: 10,
      ...( /sslmode=require|ssl=true/i.test(databaseUrl)
        ? { ssl: { rejectUnauthorized: false } }
        : {}),
    })
  : null;

const allowedOrigins = (process.env.HOCUSPOCUS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const server = new Server({
  port,
  extensions: [
    new Logger(),
    ...(pool
      ? [
          new Database({
            fetch: async ({ documentName }) => {
              const res = await pool.query(
                'SELECT data FROM yjs_documents WHERE name = $1',
                [documentName],
              );
              const row = res.rows[0];
              return row?.data ? new Uint8Array(row.data) : null;
            },
            store: async ({ documentName, state }) => {
              await pool.query(
                `INSERT INTO yjs_documents (name, data, updated_at)
                 VALUES ($1, $2, now())
                 ON CONFLICT (name) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
                [documentName, Buffer.from(state)],
              );
            },
          }),
        ]
      : []),
  ],
  async onRequest({ request, response }) {
    const path = request.url?.split('?')[0] ?? '';
    if (path === '/' || path === '/healthz') {
      response.writeHead(200, { 'Content-Type': 'text/plain' });
      response.end('ok');
      return Promise.reject();
    }
  },
  async onConnect({ requestHeaders }) {
    if (allowedOrigins.length === 0) return true;
    const origin = requestHeaders.origin ?? '';
    return allowedOrigins.some((o) => o.toLowerCase() === origin.toLowerCase());
  },
});

await server.listen();
console.log(`[hocuspocus] listening on 0.0.0.0:${port}`);
