#!/usr/bin/env node
/**
 * Minimal self-hosted Hocuspocus server for Yjs canvas shadow mode.
 *
 *   npm run hocuspocus
 *   VITE_HOCUSPOCUS_URL=ws://localhost:1234 VITE_YJS_SHADOW=true npm run dev
 */
import { Server } from '@hocuspocus/server';

const DEFAULT_PORT = 1234;

function parsePort(value) {
  const port = Number(value ?? DEFAULT_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`[hocuspocus] invalid HOCUSPOCUS_PORT: ${value}`);
    process.exit(1);
  }
  return port;
}

const port = parsePort(process.env.HOCUSPOCUS_PORT);

const server = new Server({
  port,
  async onConnect() {
    return true;
  },
});

await server.listen();
console.log(`[hocuspocus] listening on ws://localhost:${port}`);
