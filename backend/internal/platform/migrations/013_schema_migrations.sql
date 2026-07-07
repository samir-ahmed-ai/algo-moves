-- Migration audit trail — records which schema files have been applied.
create table if not exists public.schema_migrations (
  version    text primary key,
  applied_at timestamptz not null default now()
);

comment on table public.schema_migrations is 'Tracks applied db/migrations/*.sql versions for deploy auditing.';
