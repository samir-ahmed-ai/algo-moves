-- name: LeaderboardGame :many
select
  row_number() over (order by gs.mmr desc, gs.wins desc) as rank,
  p.id as profile_id,
  p.display_name,
  p.avatar_seed,
  p.level,
  gs.mmr,
  gs.wins,
  gs.losses,
  gs.matches_played
from public.game_stats gs
join public.profiles p on p.id = gs.profile_id
where gs.game_id = sqlc.arg(game)
order by gs.mmr desc, gs.wins desc
limit sqlc.arg(row_limit);

-- name: LeaderboardGlobal :many
select
  row_number() over (order by p.xp desc) as rank,
  p.id as profile_id,
  p.display_name,
  p.avatar_seed,
  p.level,
  p.xp
from public.profiles p
order by p.xp desc
limit sqlc.arg(row_limit);

-- name: LeaderboardRecent :many
select
  row_number() over (order by count(*) desc) as rank,
  p.id as profile_id,
  p.display_name,
  p.avatar_seed,
  p.level,
  count(*) as wins
from public.match_participants mp
join public.matches m on m.id = mp.match_id
join public.profiles p on p.id = mp.profile_id
where mp.placement = 1
  and m.ended_at >= sqlc.arg(since)
  and (sqlc.narg(game) is null or m.game_id = sqlc.narg(game))
group by p.id, p.display_name, p.avatar_seed, p.level
order by wins desc
limit sqlc.arg(row_limit);
