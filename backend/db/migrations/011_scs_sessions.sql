-- Server-side HTTP sessions (alexedwards/scs postgresstore).

create table if not exists public.sessions (
  token text primary key,
  data bytea not null,
  expiry timestamptz not null
);

create index if not exists sessions_expiry_idx on public.sessions (expiry);
