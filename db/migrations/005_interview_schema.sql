-- Durable interview sessions: a saved collaborative interview whiteboard with a
-- guest-shareable link. Real-time collaboration reuses the generic room relay
-- (see internal/hub) via room_code, so there is no interview-specific socket.
-- `canvas`/`questions`/`rubric` are opaque JSON — the backend never inspects
-- them. `canvas_locked`/`guest_link_enabled`/`status` are advisory metadata the
-- frontend enforces; they gate the public guest read here.

create table if not exists public.interview_sessions (
  id                  uuid primary key default gen_random_uuid(),
  owner_profile_id    uuid references public.profiles (id) on delete set null,
  room_code           text,
  title               text not null default 'Untitled interview',
  status              text not null default 'active',      -- active | ended
  guest_token         text not null,
  guest_link_enabled  boolean not null default true,
  canvas_locked       boolean not null default false,
  canvas              jsonb not null default '{}'::jsonb,
  questions           jsonb not null default '[]'::jsonb,
  notes               text not null default '',
  rubric              jsonb not null default '[]'::jsonb,
  recommendation      text not null default '',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  ended_at            timestamptz
);

comment on table public.interview_sessions is 'Durable interview whiteboard session (opaque canvas/questions/rubric JSON) with a guest link; real-time sync via room_code relay.';

create unique index if not exists interview_sessions_guest_token_idx on public.interview_sessions (guest_token);
create index if not exists interview_sessions_owner_idx on public.interview_sessions (owner_profile_id, created_at desc);
create index if not exists interview_sessions_room_idx on public.interview_sessions (room_code);
