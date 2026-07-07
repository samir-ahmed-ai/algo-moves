-- name: ListActiveGames :many
select id, title, sort_order, active, created_at
from public.games
where active = true
order by sort_order, id;

-- name: GetGameByID :one
select id, title, sort_order, active, created_at
from public.games
where id = sqlc.arg(game_id)::text;
