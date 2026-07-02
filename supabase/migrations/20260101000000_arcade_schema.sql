-- Algo Moves — Games Arcade schema
-- Persistence for the multiplayer arcade: profiles, matches, per-game stats,
-- leaderboards, achievements, persistent rooms, friends and daily challenges.
--
-- The realtime relay stays in the Go server; Supabase only stores durable data.
-- Score-affecting writes go exclusively through SECURITY DEFINER functions (see
-- the companion functions migration) so clients cannot forge stats — direct
-- INSERT/UPDATE on matches/stats is intentionally denied by RLS below.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user (anonymous or upgraded). Auto-created by a
-- trigger on auth.users so a guest can play the instant they sign in.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null default ('Guest-' || upper(substr(md5(random()::text), 1, 4))),
  avatar_seed   text not null default md5(random()::text),
  is_anonymous  boolean not null default true,
  xp            integer not null default 0 check (xp >= 0),
  level         integer generated always as (1 + floor(sqrt(xp::numeric / 100.0))::int) stored,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is 'Player profile, one per auth user (guest or upgraded).';

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
  placement    integer not null default 1,   -- 1 = winner; ties share a placement
  score        integer not null default 0,
  mmr_before   integer,
  mmr_after    integer,
  created_at   timestamptz not null default now()
);
create index if not exists mp_match_idx on public.match_participants (match_id);
create index if not exists mp_profile_idx on public.match_participants (profile_id, created_at desc);

-- ---------------------------------------------------------------------------
-- game_stats: per (profile, game) rating and record. Written only by the
-- submit_match_result RPC.
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
-- rooms: a shareable, persistent room registry so codes survive server
-- restarts and public rooms can be discovered in the lobby.
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
-- daily_challenges: one seeded challenge per day, for a shared daily board.
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

-- ---------------------------------------------------------------------------
-- Auto-provision a profile whenever an auth user is created.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, is_anonymous)
  values (new.id, coalesce(new.is_anonymous, false))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles              enable row level security;
alter table public.matches               enable row level security;
alter table public.match_participants    enable row level security;
alter table public.game_stats            enable row level security;
alter table public.achievements          enable row level security;
alter table public.profile_achievements  enable row level security;
alter table public.rooms                 enable row level security;
alter table public.friends               enable row level security;
alter table public.daily_challenges      enable row level security;
alter table public.daily_challenge_scores enable row level security;

-- profiles: everyone can read (rosters, leaderboards); you edit only your own.
create policy "profiles readable" on public.profiles for select using (true);
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "update own profile" on public.profiles for update using (auth.uid() = id);

-- matches + participants + stats + achievements: readable by all, written only
-- by SECURITY DEFINER RPCs (no INSERT/UPDATE policies for clients => denied).
create policy "matches readable" on public.matches for select using (true);
create policy "participants readable" on public.match_participants for select using (true);
create policy "stats readable" on public.game_stats for select using (true);
create policy "achievements readable" on public.achievements for select using (true);
create policy "profile achievements readable" on public.profile_achievements for select using (true);

-- rooms: public rooms (and your own) are readable; you manage rooms you host.
create policy "rooms readable" on public.rooms for select
  using (is_public or host_profile_id = auth.uid());
create policy "insert own room" on public.rooms for insert
  with check (host_profile_id = auth.uid());
create policy "update own room" on public.rooms for update
  using (host_profile_id = auth.uid());
create policy "delete own room" on public.rooms for delete
  using (host_profile_id = auth.uid());

-- friends: you see and manage your own edges.
create policy "friends readable" on public.friends for select
  using (profile_id = auth.uid() or friend_profile_id = auth.uid());
create policy "insert own friend" on public.friends for insert
  with check (profile_id = auth.uid());
create policy "update own friend" on public.friends for update
  using (profile_id = auth.uid() or friend_profile_id = auth.uid());
create policy "delete own friend" on public.friends for delete
  using (profile_id = auth.uid() or friend_profile_id = auth.uid());

-- daily challenges: catalog readable by all; scores readable by all, you write
-- only your own row.
create policy "daily readable" on public.daily_challenges for select using (true);
create policy "daily scores readable" on public.daily_challenge_scores for select using (true);
create policy "insert own daily score" on public.daily_challenge_scores for insert
  with check (profile_id = auth.uid());
create policy "update own daily score" on public.daily_challenge_scores for update
  using (profile_id = auth.uid());
