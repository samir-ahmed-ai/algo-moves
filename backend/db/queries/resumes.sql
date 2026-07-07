-- name: ListResumeSummaries :many
select
  r.id::text as id,
  r.title,
  r.original_filename,
  r.is_public,
  r.updated_at
from public.resumes r
where r.owner_profile_id = sqlc.arg(owner_profile_id)::uuid
order by r.created_at desc
limit 200;

-- name: ListPublicResumeDirectory :many
select
  r.id::text as id,
  r.title,
  r.original_filename,
  r.updated_at,
  p.id::text as owner_profile_id,
  p.display_name as owner_display_name,
  p.avatar_seed as owner_avatar_seed
from public.resumes r
join public.profiles p on p.id = r.owner_profile_id
where r.is_public = true
order by r.updated_at desc
limit 500;

-- name: CreateResume :one
insert into public.resumes (
  owner_profile_id,
  title,
  original_filename,
  content_type,
  file_bytes,
  raw_text,
  mapping,
  is_public
)
values (
  sqlc.arg(owner_profile_id)::uuid,
  sqlc.arg(title),
  sqlc.arg(original_filename),
  sqlc.arg(content_type),
  sqlc.arg(file_bytes),
  sqlc.arg(raw_text),
  sqlc.arg(mapping),
  sqlc.arg(is_public)
)
returning
  id::text,
  owner_profile_id::text,
  title,
  original_filename,
  content_type,
  raw_text,
  mapping,
  is_public,
  created_at,
  updated_at;

-- name: GetResumeByID :one
select
  id::text,
  owner_profile_id::text,
  title,
  original_filename,
  content_type,
  raw_text,
  mapping,
  is_public,
  created_at,
  updated_at
from public.resumes
where id = sqlc.arg(id)::uuid;

-- name: GetResumeByIDForOwner :one
select
  id::text,
  owner_profile_id::text,
  title,
  original_filename,
  content_type,
  raw_text,
  mapping,
  is_public,
  created_at,
  updated_at
from public.resumes
where id = sqlc.arg(id)::uuid and owner_profile_id = sqlc.arg(owner_profile_id)::uuid;

-- name: UpdateResume :one
update public.resumes
set
  title = coalesce(sqlc.narg(title), title),
  mapping = coalesce(sqlc.narg(mapping), mapping),
  is_public = coalesce(sqlc.narg(is_public), is_public),
  updated_at = now()
where id = sqlc.arg(id)::uuid and owner_profile_id = sqlc.arg(owner_profile_id)::uuid
returning
  id::text,
  owner_profile_id::text,
  title,
  original_filename,
  content_type,
  raw_text,
  mapping,
  is_public,
  created_at,
  updated_at;

-- name: DeleteResume :execrows
delete from public.resumes
where id = sqlc.arg(id)::uuid and owner_profile_id = sqlc.arg(owner_profile_id)::uuid;

-- name: CreateResumeVariant :one
insert into public.resume_variants (
  resume_id,
  owner_profile_id,
  label,
  focus,
  target_role,
  mode,
  mapping
)
values (
  sqlc.arg(resume_id)::uuid,
  sqlc.arg(owner_profile_id)::uuid,
  sqlc.arg(label),
  sqlc.arg(focus),
  sqlc.arg(target_role),
  sqlc.arg(mode),
  sqlc.arg(mapping)
)
returning
  id::text,
  resume_id::text,
  owner_profile_id::text,
  label,
  focus,
  target_role,
  mode,
  mapping,
  created_at;

-- name: ListResumeVariants :many
select
  id::text,
  resume_id::text,
  owner_profile_id::text,
  label,
  focus,
  target_role,
  mode,
  mapping,
  created_at
from public.resume_variants
where resume_id = sqlc.arg(resume_id)::uuid and owner_profile_id = sqlc.arg(owner_profile_id)::uuid
order by created_at desc
limit 100;
