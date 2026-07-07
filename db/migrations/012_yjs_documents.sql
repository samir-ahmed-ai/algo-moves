-- Yjs CRDT document persistence for Hocuspocus (canvas room codes as document names).
create table if not exists public.yjs_documents (
  name       text primary key,
  data       bytea not null,
  updated_at timestamptz not null default now()
);

create index if not exists yjs_documents_updated_at_idx on public.yjs_documents (updated_at desc);
