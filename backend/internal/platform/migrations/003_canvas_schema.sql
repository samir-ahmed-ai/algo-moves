-- Durable shared canvases: a saved snapshot of a collaborative canvas document,
-- optionally tied to the live room it was last synced from. `doc` is opaque
-- JSON (the frontend's ProjectState) — the backend never inspects it.

create table if not exists public.canvases (
  id                uuid primary key default gen_random_uuid(),
  owner_profile_id  uuid references public.profiles (id) on delete set null,
  room_code         text,
  title             text not null default 'Untitled',
  doc               jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.canvases is 'Saved collaborative canvas snapshot (opaque ProjectState doc).';

create index if not exists canvases_owner_idx on public.canvases (owner_profile_id, updated_at desc);
create index if not exists canvases_updated_idx on public.canvases (updated_at desc);
