-- Algo Moves — Games Arcade schema (standalone PostgreSQL)
-- Persistence for the multiplayer arcade: profiles, matches, per-game stats,
-- leaderboards, achievements, persistent rooms, friends and daily challenges.
--
-- The realtime relay stays in the Go server; Postgres stores durable data.
-- Score-affecting writes go exclusively through SECURITY DEFINER functions so
-- clients cannot forge stats.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles: one row per player (guest or signed-in). Created via the backend
-- guest-auth endpoint; session_token authenticates mutating API calls.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key default gen_random_uuid(),
  session_token text unique,
  display_name  text not null default ('Guest-' || upper(substr(md5(random()::text), 1, 4))),
  avatar_seed   text not null default md5(random()::text),
  is_anonymous  boolean not null default true,
  xp            integer not null default 0 check (xp >= 0),
  level         integer generated always as (1 + floor(sqrt(xp::numeric / 100.0))::int) stored,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is 'Player profile (guest or upgraded).';

-- ---------------------------------------------------------------------------
-- matches + participants: the durable record of a finished game.
-- ---------------------------------------------------------------------------
create table if not exists public.matches (
  id                 uuid primary key default gen_random_uuid(),
  game_id            text not null,
  room_code          text,
  mode               text not null default 'duel' check (mode in ('duel', 'ffa', 'tournament')),
  winner_profile_id  uuid references public.profiles (id) on delete set null,
  started_at         timestamptz,
  ended_at           timestamptz not null default now(),
  metadata           jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);
create index if not exists matches_game_ended_idx on public.matches (game_id, ended_at desc);

create table if not exists public.match_participants (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid not null references public.matches (id) on delete cascade,
  profile_id   uuid references public.profiles (id) on delete set null,
  display_name text not null,
  placement    integer not null default 1,
  score        integer not null default 0,
  mmr_before   integer,
  mmr_after    integer,
  created_at   timestamptz not null default now()
);
create index if not exists mp_match_idx on public.match_participants (match_id);
create index if not exists mp_profile_idx on public.match_participants (profile_id, created_at desc);

-- ---------------------------------------------------------------------------
-- game_stats: per (profile, game) rating and record.
-- ---------------------------------------------------------------------------
create table if not exists public.game_stats (
  profile_id      uuid not null references public.profiles (id) on delete cascade,
  game_id         text not null,
  mmr             integer not null default 1000,
  wins            integer not null default 0,
  losses          integer not null default 0,
  draws           integer not null default 0,
  streak          integer not null default 0,
  best_streak     integer not null default 0,
  matches_played  integer not null default 0,
  updated_at      timestamptz not null default now(),
  primary key (profile_id, game_id)
);
create index if not exists game_stats_leaderboard_idx on public.game_stats (game_id, mmr desc);

-- ---------------------------------------------------------------------------
-- achievements: static catalog + per-profile unlocks.
-- ---------------------------------------------------------------------------
create table if not exists public.achievements (
  id          text primary key,
  title       text not null,
  description text not null,
  icon        text not null default 'trophy',
  points      integer not null default 10,
  sort_order  integer not null default 0
);

create table if not exists public.profile_achievements (
  profile_id     uuid not null references public.profiles (id) on delete cascade,
  achievement_id text not null references public.achievements (id) on delete cascade,
  unlocked_at    timestamptz not null default now(),
  primary key (profile_id, achievement_id)
);

-- ---------------------------------------------------------------------------
-- rooms: persistent room registry.
-- ---------------------------------------------------------------------------
create table if not exists public.rooms (
  code             text primary key,
  host_profile_id  uuid references public.profiles (id) on delete set null,
  title            text,
  game_id          text,
  mode             text not null default 'duel' check (mode in ('duel', 'ffa', 'tournament')),
  capacity         integer not null default 2 check (capacity between 2 and 8),
  is_public        boolean not null default false,
  created_at       timestamptz not null default now(),
  last_active_at   timestamptz not null default now()
);
create index if not exists rooms_public_idx on public.rooms (is_public, last_active_at desc);

-- ---------------------------------------------------------------------------
-- friends / recent players.
-- ---------------------------------------------------------------------------
create table if not exists public.friends (
  profile_id         uuid not null references public.profiles (id) on delete cascade,
  friend_profile_id  uuid not null references public.profiles (id) on delete cascade,
  status             text not null default 'pending' check (status in ('pending', 'accepted', 'recent')),
  created_at         timestamptz not null default now(),
  primary key (profile_id, friend_profile_id),
  check (profile_id <> friend_profile_id)
);

-- ---------------------------------------------------------------------------
-- daily_challenges
-- ---------------------------------------------------------------------------
create table if not exists public.daily_challenges (
  challenge_date date primary key,
  game_id        text not null,
  seed           text not null,
  config         jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create table if not exists public.daily_challenge_scores (
  challenge_date date not null references public.daily_challenges (challenge_date) on delete cascade,
  profile_id     uuid not null references public.profiles (id) on delete cascade,
  score          integer not null default 0,
  created_at     timestamptz not null default now(),
  primary key (challenge_date, profile_id)
);

-- keep profiles.updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
