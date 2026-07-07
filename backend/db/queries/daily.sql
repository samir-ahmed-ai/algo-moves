-- name: GetOrCreateDailyChallenge :one
select *
from public.get_or_create_daily_challenge(sqlc.arg(challenge_date)::date);

-- name: SubmitDailyScore :exec
select public.submit_daily_score(sqlc.arg(profile_id)::uuid, sqlc.arg(challenge_date)::date, sqlc.arg(score));
