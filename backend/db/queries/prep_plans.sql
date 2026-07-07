-- name: ListPrepPlanSummaries :many
select
  p.id::text as id,
  p.title,
  p.updated_at,
  count(i.item_id)::int as item_count,
  count(i.item_id) filter (where i.completed = true)::int as completed_count
from public.prep_plans p
left join public.prep_plan_items i on i.plan_id = p.id
where p.owner_profile_id = sqlc.arg(owner_profile_id)::uuid
group by p.id, p.title, p.updated_at
order by p.created_at desc
limit 200;

-- name: CreatePrepPlan :one
insert into public.prep_plans (owner_profile_id, title)
values (sqlc.arg(owner_profile_id)::uuid, sqlc.arg(title))
returning
  id::text,
  owner_profile_id::text,
  title,
  notes,
  created_at,
  updated_at;

-- name: GetPrepPlanHeader :one
select
  id::text,
  owner_profile_id::text,
  title,
  notes,
  created_at,
  updated_at
from public.prep_plans
where id = sqlc.arg(id)::uuid and owner_profile_id = sqlc.arg(owner_profile_id)::uuid;

-- name: ListPrepPlanItems :many
select item_id, position, completed
from public.prep_plan_items
where plan_id = sqlc.arg(plan_id)::uuid
order by position asc;

-- name: UpdatePrepPlanMeta :one
update public.prep_plans
set
  title = coalesce(sqlc.narg(title), title),
  notes = coalesce(sqlc.narg(notes), notes),
  updated_at = now()
where id = sqlc.arg(id)::uuid and owner_profile_id = sqlc.arg(owner_profile_id)::uuid
returning
  id::text,
  owner_profile_id::text,
  title,
  notes,
  created_at,
  updated_at;

-- name: DeletePrepPlanItems :exec
delete from public.prep_plan_items
where plan_id = sqlc.arg(plan_id)::uuid;

-- name: InsertPrepPlanItem :exec
insert into public.prep_plan_items (plan_id, item_id, position, completed)
values (sqlc.arg(plan_id)::uuid, sqlc.arg(item_id), sqlc.arg(position), sqlc.arg(completed));

-- name: DeletePrepPlan :execrows
delete from public.prep_plans
where id = sqlc.arg(id)::uuid and owner_profile_id = sqlc.arg(owner_profile_id)::uuid;
