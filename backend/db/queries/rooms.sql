-- name: UpsertRoom :one
insert into public.rooms (code, host_profile_id, title, game_id, mode, capacity, is_public, last_active_at)
values (
  sqlc.arg(code),
  sqlc.narg(host_profile_id)::uuid,
  nullif(sqlc.arg(title), ''),
  nullif(sqlc.arg(game_id), ''),
  sqlc.arg(mode),
  sqlc.arg(capacity)::int,
  sqlc.arg(is_public),
  now()
)
on conflict (code) do update set
  host_profile_id = coalesce(excluded.host_profile_id, public.rooms.host_profile_id),
  title = coalesce(excluded.title, public.rooms.title),
  game_id = coalesce(excluded.game_id, public.rooms.game_id),
  mode = coalesce(excluded.mode, public.rooms.mode),
  capacity = coalesce(excluded.capacity, public.rooms.capacity),
  is_public = coalesce(excluded.is_public, public.rooms.is_public),
  last_active_at = now()
returning *;

-- name: GetRoom :one
select *
from public.rooms
where code = sqlc.arg(code);

-- name: ListPublicRooms :many
select *
from public.rooms
where is_public = true
order by last_active_at desc
limit sqlc.arg(row_limit);

-- name: TouchRoom :exec
update public.rooms
set last_active_at = now()
where code = sqlc.arg(code);
