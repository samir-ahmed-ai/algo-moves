-- name: GameStatsByProfile :many
select
  profile_id,
  game_id,
  mmr,
  wins,
  losses,
  draws,
  streak,
  best_streak,
  matches_played,
  updated_at
from public.game_stats
where profile_id = sqlc.arg(profile_id)::uuid;

-- name: MatchHistory :many
select
  mp.id,
  mp.match_id,
  mp.profile_id,
  mp.display_name,
  mp.placement,
  mp.score,
  mp.mmr_before,
  mp.mmr_after,
  mp.created_at,
  row_to_json(m.*) as match
from public.match_participants mp
join public.matches m on m.id = mp.match_id
where mp.profile_id = sqlc.arg(profile_id)::uuid
order by mp.created_at desc
limit sqlc.arg(row_limit);

-- name: SubmitMatchResult :one
select public.submit_match_result(
  sqlc.arg(game),
  sqlc.arg(room),
  sqlc.arg(mode),
  sqlc.arg(participants)::jsonb,
  sqlc.arg(metadata)::jsonb
)::jsonb as result;
