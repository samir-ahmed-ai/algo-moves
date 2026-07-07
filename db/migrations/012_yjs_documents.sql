-- Yjs CRDT document persistence for Hocuspocus (canvas room codes as document names).
CREATE TABLE IF NOT EXISTS yjs_documents (
  name TEXT PRIMARY KEY,
  data BYTEA NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS yjs_documents_updated_at_idx ON yjs_documents (updated_at DESC);
