#!/usr/bin/env node
/**
 * Minimal self-hosted Hocuspocus server for Yjs canvas shadow mode.
 *
 *   npm run hocuspocus
 *   VITE_HOCUSPOCUS_URL=ws://localhost:1234 VITE_YJS_SHADOW=true npm run dev
 */
import { Server } from '@hocuspocus/server';

const port = Number(process.env.HOCUSPOCUS_PORT ?? 1234);

const server = Server.configure({
  port,
  async onConnect() {
    return true;
  },
});

server.listen();
console.log(`[hocuspocus] listening on ws://localhost:${port}`);
