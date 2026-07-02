-- Algo Moves — Games Arcade functions, RPCs and leaderboards.
--
-- All score-affecting writes live here as SECURITY DEFINER functions so the
-- client can never forge stats: RLS denies direct writes to matches/stats, and
-- these functions (owned by the migration role) perform the trusted updates.

-- Award an achievement to a profile, but only if it exists in the catalog
-- (avoids FK errors when the seed hasn't been loaded). Internal helper.
create or replace function public.award_if(p_profile uuid, p_ach text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.profile_achievements (profile_id, achievement_id)
  select p_profile, a.id from public.achievements a where a.id = p_ach
  on conflict do nothing;
$$;

-- Unlock an achievement for the calling user (idempotent).
create or replace function public.unlock_achievement(p_ach text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  perform public.award_if(auth.uid(), p_ach);
end;
$$;

-- ---------------------------------------------------------------------------
-- submit_match_result: the single entry point for recording a finished game.
-- Inserts the match + participants, updates per-game MMR (placement-based Elo),
-- win/loss/draw record and streaks, awards XP and unlocks milestone
-- achievements — all in one transaction. Returns the new match id and each
-- participant's rating delta.
--
-- p_participants: jsonb array of
--   { "profile_id": uuid|null, "display_name": text, "placement": int, "score": int }
-- placement 1 = best; ties share a placement (a two-way tie for 1st is a draw).
-- ---------------------------------------------------------------------------
create or replace function public.submit_match_result(
  p_game         text,
  p_room         text,
  p_mode         text,
  p_participants jsonb,
  p_metadata     jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match_id   uuid;
  v_n          int;
  v_total      numeric;
  v_num_first  int;
  v_winner     uuid;
  v_results    jsonb := '[]'::jsonb;
  rec          record;
  v_actual     numeric;
  v_avg_other  numeric;
  v_expected   numeric;
  v_delta      int;
  v_new_mmr    int;
  v_res        text;
  v_streak     int;
begin
  if p_participants is null or jsonb_typeof(p_participants) <> 'array'
     or jsonb_array_length(p_participants) = 0 then
    raise exception 'p_participants must be a non-empty json array';
  end if;

  create temp table _mp (
    profile_id   uuid,
    display_name text,
    placement    int,
    score        int,
    mmr_before   int
  ) on commit drop;

  insert into _mp (profile_id, display_name, placement, score, mmr_before)
  select
    nullif(e->>'profile_id', '')::uuid,
    coalesce(e->>'display_name', 'Player'),
    coalesce((e->>'placement')::int, 1),
    coalesce((e->>'score')::int, 0),
    coalesce(gs.mmr, 1000)
  from jsonb_array_elements(p_participants) e
  left join public.game_stats gs
    on gs.profile_id = nullif(e->>'profile_id', '')::uuid and gs.game_id = p_game;

  select count(*), coalesce(sum(mmr_before), 0) into v_n, v_total from _mp;
  select count(*) into v_num_first from _mp where placement = 1;
  if v_num_first = 1 then
    select profile_id into v_winner from _mp where placement = 1 limit 1;
  else
    v_winner := null;
  end if;

  insert into public.matches (game_id, room_code, mode, winner_profile_id, metadata)
  values (p_game, p_room, coalesce(p_mode, 'duel'), v_winner, coalesce(p_metadata, '{}'::jsonb))
  returning id into v_match_id;

  for rec in select * from _mp loop
    if v_n > 1 then
      v_actual    := (v_n - rec.placement)::numeric / (v_n - 1);
      v_avg_other := (v_total - rec.mmr_before)::numeric / (v_n - 1);
    else
      v_actual    := 0.5;
      v_avg_other := rec.mmr_before;
    end if;
    v_expected := 1.0 / (1.0 + power(10.0, (v_avg_other - rec.mmr_before) / 400.0));
    v_delta    := round(32 * (v_actual - v_expected));
    v_new_mmr  := rec.mmr_before + v_delta;

    if rec.placement = 1 and v_num_first = 1 then
      v_res := 'win';
    elsif rec.placement = 1 then
      v_res := 'draw';
    else
      v_res := 'loss';
    end if;

    insert into public.match_participants
      (match_id, profile_id, display_name, placement, score, mmr_before, mmr_after)
    values
      (v_match_id, rec.profile_id, rec.display_name, rec.placement, rec.score,
       rec.mmr_before, case when rec.profile_id is null then null else v_new_mmr end);

    if rec.profile_id is not null then
      insert into public.game_stats
        (profile_id, game_id, mmr, wins, losses, draws, streak, best_streak, matches_played)
      values
        (rec.profile_id, p_game, v_new_mmr,
         (v_res = 'win')::int, (v_res = 'loss')::int, (v_res = 'draw')::int,
         (v_res = 'win')::int, (v_res = 'win')::int, 1)
      on conflict (profile_id, game_id) do update set
        mmr            = v_new_mmr,
        wins           = public.game_stats.wins   + (v_res = 'win')::int,
        losses         = public.game_stats.losses + (v_res = 'loss')::int,
        draws          = public.game_stats.draws  + (v_res = 'draw')::int,
        streak         = case when v_res = 'win' then greatest(public.game_stats.streak, 0) + 1 else 0 end,
        best_streak    = greatest(public.game_stats.best_streak,
                                  case when v_res = 'win' then greatest(public.game_stats.streak, 0) + 1 else 0 end),
        matches_played = public.game_stats.matches_played + 1,
        updated_at     = now();

      select streak into v_streak from public.game_stats
        where profile_id = rec.profile_id and game_id = p_game;

      update public.profiles
        set xp = xp + case when v_res = 'win' then 25 when v_res = 'draw' then 12 else 6 end
        where id = rec.profile_id;

      perform public.award_if(rec.profile_id, 'first-match');
      if v_res = 'win' then perform public.award_if(rec.profile_id, 'first-win'); end if;
      if v_streak >= 5  then perform public.award_if(rec.profile_id, 'streak-5');  end if;
      if v_streak >= 10 then perform public.award_if(rec.profile_id, 'streak-10'); end if;
    else
      v_streak := 0;
    end if;

    v_results := v_results || jsonb_build_object(
      'profile_id', rec.profile_id,
      'result',     v_res,
      'mmr_before', rec.mmr_before,
      'mmr_after',  v_new_mmr,
      'mmr_delta',  v_delta,
      'streak',     v_streak
    );
  end loop;

  return jsonb_build_object('match_id', v_match_id, 'participants', v_results);
end;
$$;

-- ---------------------------------------------------------------------------
-- Leaderboards. Three focused readers the client picks between by period.
-- ---------------------------------------------------------------------------

-- All-time, per game, ranked by MMR.
create or replace function public.leaderboard_game(p_game text, p_limit int default 50)
returns table (
  rank bigint, profile_id uuid, display_name text, avatar_seed text,
  level int, mmr int, wins int, losses int, matches_played int
)
language sql stable
set search_path = public
as $$
  select row_number() over (order by gs.mmr desc, gs.wins desc) as rank,
         p.id, p.display_name, p.avatar_seed, p.level,
         gs.mmr, gs.wins, gs.losses, gs.matches_played
  from public.game_stats gs
  join public.profiles p on p.id = gs.profile_id
  where gs.game_id = p_game
  order by gs.mmr desc, gs.wins desc
  limit greatest(p_limit, 1);
$$;

-- All-time, across all games, ranked by XP / level.
create or replace function public.leaderboard_global(p_limit int default 50)
returns table (
  rank bigint, profile_id uuid, display_name text, avatar_seed text, level int, xp int
)
language sql stable
set search_path = public
as $$
  select row_number() over (order by p.xp desc) as rank,
         p.id, p.display_name, p.avatar_seed, p.level, p.xp
  from public.profiles p
  order by p.xp desc
  limit greatest(p_limit, 1);
$$;

-- Rolling window (day / week), ranked by wins in that window. p_game null =
-- across all games.
create or replace function public.leaderboard_recent(
  p_since timestamptz,
  p_game  text default null,
  p_limit int default 50
)
returns table (
  rank bigint, profile_id uuid, display_name text, avatar_seed text, level int, wins bigint
)
language sql stable
set search_path = public
as $$
  select row_number() over (order by count(*) desc) as rank,
         p.id, p.display_name, p.avatar_seed, p.level, count(*) as wins
  from public.match_participants mp
  join public.matches m  on m.id = mp.match_id
  join public.profiles p on p.id = mp.profile_id
  where mp.placement = 1
    and m.ended_at >= p_since
    and (p_game is null or m.game_id = p_game)
  group by p.id, p.display_name, p.avatar_seed, p.level
  order by wins desc
  limit greatest(p_limit, 1);
$$;

-- ---------------------------------------------------------------------------
-- Daily challenge: deterministic per-day seed, created on first read.
-- ---------------------------------------------------------------------------
create or replace function public.get_or_create_daily_challenge(p_date date default current_date)
returns public.daily_challenges
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row   public.daily_challenges;
  v_games text[] := array['number-duel', 'rock-paper-scissors', 'tic-tac-toe', 'mind-meld', 'reaction-duel'];
  v_idx   int;
begin
  select * into v_row from public.daily_challenges where challenge_date = p_date;
  if found then
    return v_row;
  end if;

  -- Pick a game deterministically from the date so every client agrees.
  v_idx := (('x' || substr(md5(p_date::text), 1, 8))::bit(32)::bigint % array_length(v_games, 1)) + 1;
  insert into public.daily_challenges (challenge_date, game_id, seed)
  values (p_date, v_games[v_idx], md5(p_date::text))
  on conflict (challenge_date) do nothing;

  select * into v_row from public.daily_challenges where challenge_date = p_date;
  return v_row;
end;
$$;

-- Record (best-only) a daily challenge score for the caller.
create or replace function public.submit_daily_score(p_date date, p_score int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  insert into public.daily_challenge_scores (challenge_date, profile_id, score)
  values (p_date, auth.uid(), p_score)
  on conflict (challenge_date, profile_id)
    do update set score = greatest(public.daily_challenge_scores.score, excluded.score);
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: let signed-in users (including anonymous sessions) call the RPCs.
-- ---------------------------------------------------------------------------
grant execute on function public.submit_match_result(text, text, text, jsonb, jsonb) to authenticated;
grant execute on function public.unlock_achievement(text) to authenticated;
grant execute on function public.leaderboard_game(text, int) to authenticated, anon;
grant execute on function public.leaderboard_global(int) to authenticated, anon;
grant execute on function public.leaderboard_recent(timestamptz, text, int) to authenticated, anon;
grant execute on function public.get_or_create_daily_challenge(date) to authenticated, anon;
grant execute on function public.submit_daily_score(date, int) to authenticated;
