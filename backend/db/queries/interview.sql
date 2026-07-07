-- name: CreateInterviewSession :one
insert into public.interview_sessions (owner_profile_id, title, guest_token)
values (sqlc.arg(owner_profile_id)::uuid, sqlc.arg(title), sqlc.arg(guest_token))
returning
  id::text,
  owner_profile_id,
  room_code,
  title,
  status,
  guest_token,
  guest_link_enabled,
  canvas_locked,
  canvas,
  questions,
  notes,
  rubric,
  recommendation,
  created_at,
  updated_at,
  ended_at;

-- name: ListInterviewSummaries :many
select
  id::text,
  title,
  status,
  room_code,
  guest_link_enabled,
  canvas_locked,
  updated_at
from public.interview_sessions
where owner_profile_id = sqlc.arg(owner_profile_id)::uuid
order by created_at desc
limit 200;

-- name: GetInterviewSession :one
select
  id::text,
  owner_profile_id,
  room_code,
  title,
  status,
  guest_token,
  guest_link_enabled,
  canvas_locked,
  canvas,
  questions,
  notes,
  rubric,
  recommendation,
  created_at,
  updated_at,
  ended_at
from public.interview_sessions
where id = sqlc.arg(id)::uuid;

-- name: GetInterviewSessionByToken :one
select
  id::text,
  owner_profile_id,
  room_code,
  title,
  status,
  guest_token,
  guest_link_enabled,
  canvas_locked,
  canvas,
  questions,
  notes,
  rubric,
  recommendation,
  created_at,
  updated_at,
  ended_at
from public.interview_sessions
where guest_token = sqlc.arg(guest_token);

-- name: EndInterviewSession :one
update public.interview_sessions
set status = 'ended', ended_at = now(), updated_at = now()
where id = sqlc.arg(id)::uuid and owner_profile_id = sqlc.arg(owner_profile_id)::uuid
returning
  id::text,
  owner_profile_id,
  room_code,
  title,
  status,
  guest_token,
  guest_link_enabled,
  canvas_locked,
  canvas,
  questions,
  notes,
  rubric,
  recommendation,
  created_at,
  updated_at,
  ended_at;

-- name: ReopenInterviewSession :one
update public.interview_sessions
set status = 'active', ended_at = null, updated_at = now()
where id = sqlc.arg(id)::uuid and owner_profile_id = sqlc.arg(owner_profile_id)::uuid
returning
  id::text,
  owner_profile_id,
  room_code,
  title,
  status,
  guest_token,
  guest_link_enabled,
  canvas_locked,
  canvas,
  questions,
  notes,
  rubric,
  recommendation,
  created_at,
  updated_at,
  ended_at;

-- name: RotateInterviewToken :one
update public.interview_sessions
set guest_token = sqlc.arg(guest_token), updated_at = now()
where id = sqlc.arg(id)::uuid and owner_profile_id = sqlc.arg(owner_profile_id)::uuid
returning
  id::text,
  owner_profile_id,
  room_code,
  title,
  status,
  guest_token,
  guest_link_enabled,
  canvas_locked,
  canvas,
  questions,
  notes,
  rubric,
  recommendation,
  created_at,
  updated_at,
  ended_at;
