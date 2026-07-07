-- name: CreateCanvas :one
insert into public.canvases (owner_profile_id, title, doc, room_code)
values (
  sqlc.arg(owner_profile_id)::uuid,
  sqlc.arg(title),
  sqlc.arg(doc)::jsonb,
  sqlc.narg(room_code)
)
returning id::text, updated_at;

-- name: GetCanvas :one
select
  id::text,
  owner_profile_id,
  room_code,
  title,
  doc,
  updated_at
from public.canvases
where id = sqlc.arg(id)::uuid;

-- name: UpdateCanvas :one
update public.canvases
set doc = sqlc.arg(doc)::jsonb,
    title = coalesce(sqlc.narg(title), title),
    room_code = coalesce(sqlc.narg(room_code), room_code),
    updated_at = now()
where id = sqlc.arg(id)::uuid and owner_profile_id = sqlc.arg(owner_profile_id)::uuid
returning updated_at;

-- name: ListCanvases :many
select id::text, title, room_code, updated_at
from public.canvases
where owner_profile_id = sqlc.arg(owner_profile_id)::uuid
order by updated_at desc
limit 100;

-- name: DeleteCanvas :execrows
delete from public.canvases
where id = sqlc.arg(id)::uuid and owner_profile_id = sqlc.arg(owner_profile_id)::uuid;
