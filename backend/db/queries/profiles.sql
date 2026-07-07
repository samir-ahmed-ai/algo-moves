-- name: GetProfileByID :one
select
  id::text,
  display_name,
  avatar_seed,
  personal_room_code,
  email,
  is_admin,
  is_anonymous,
  xp,
  level,
  created_at,
  updated_at
from public.profiles
where id = sqlc.arg(id)::uuid;

-- name: GetProfileByToken :one
select
  id::text,
  display_name,
  avatar_seed,
  personal_room_code,
  email,
  is_admin,
  is_anonymous,
  xp,
  level,
  created_at,
  updated_at
from public.profiles
where session_token = sqlc.arg(session_token);

-- name: GetProfileByEmail :one
select
  id::text,
  display_name,
  avatar_seed,
  personal_room_code,
  email,
  is_admin,
  is_anonymous,
  xp,
  level,
  created_at,
  updated_at,
  password_hash
from public.profiles
where lower(email) = lower(sqlc.arg(email));

-- name: ListProfilesByIDs :many
select
  id::text,
  display_name,
  avatar_seed,
  personal_room_code,
  email,
  is_admin,
  is_anonymous,
  xp,
  level,
  created_at,
  updated_at
from public.profiles
where id = any(sqlc.arg(ids)::uuid[]);

-- name: UpdateProfile :one
update public.profiles
set
  display_name = coalesce(sqlc.narg(display_name), display_name),
  avatar_seed = coalesce(sqlc.narg(avatar_seed), avatar_seed)
where id = sqlc.arg(id)::uuid
returning
  id::text,
  display_name,
  avatar_seed,
  personal_room_code,
  email,
  is_admin,
  is_anonymous,
  xp,
  level,
  created_at,
  updated_at;

-- name: RotateSessionToken :one
update public.profiles
set session_token = sqlc.arg(session_token)
where id = sqlc.arg(id)::uuid
returning
  id::text,
  display_name,
  avatar_seed,
  personal_room_code,
  email,
  is_admin,
  is_anonymous,
  xp,
  level,
  created_at,
  updated_at;

-- name: SetAdminByEmail :execrows
update public.profiles
set is_admin = true
where lower(email) = lower(sqlc.arg(email));

-- name: UpdatePasswordHashByEmail :execrows
update public.profiles
set password_hash = sqlc.arg(password_hash)
where lower(email) = lower(sqlc.arg(email));

-- name: CreateGuestProfile :one
insert into public.profiles (session_token, is_anonymous, personal_room_code)
values (sqlc.arg(session_token), true, sqlc.arg(personal_room_code))
returning
  id::text,
  display_name,
  avatar_seed,
  personal_room_code,
  email,
  is_admin,
  is_anonymous,
  xp,
  level,
  created_at,
  updated_at;

-- name: CreateEmailProfile :one
insert into public.profiles (
  session_token, is_anonymous, personal_room_code, email, password_hash, display_name
)
values (
  sqlc.arg(session_token),
  false,
  sqlc.arg(personal_room_code),
  sqlc.arg(email),
  sqlc.arg(password_hash),
  sqlc.arg(display_name)
)
returning
  id::text,
  display_name,
  avatar_seed,
  personal_room_code,
  email,
  is_admin,
  is_anonymous,
  xp,
  level,
  created_at,
  updated_at;
