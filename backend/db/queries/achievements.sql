-- name: ListAchievements :many
select *
from public.achievements
order by sort_order;

-- name: UnlockedAchievementIDs :many
select achievement_id
from public.profile_achievements
where profile_id = sqlc.arg(profile_id)::uuid;

-- name: UnlockAchievement :exec
select public.unlock_achievement(sqlc.arg(profile_id)::uuid, sqlc.arg(achievement_id));
