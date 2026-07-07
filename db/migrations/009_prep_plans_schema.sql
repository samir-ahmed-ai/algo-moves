-- Named interview prep plans: a user-owned ordered collection of problem item
-- ids to study before a specific interview (e.g. "Comcast interview").
-- item_id is the opaque frontend catalog item id (no FK: the item catalog is a
-- frontend/build-time concept whose ids do not map 1-to-1 to problems.id).

create table if not exists public.prep_plans (
  id               uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  title            text not null default 'Untitled plan',
  notes            text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.prep_plans is 'Named interview prep plan owned by one profile; ordered item list stored in prep_plan_items.';

create table if not exists public.prep_plan_items (
  plan_id    uuid not null references public.prep_plans (id) on delete cascade,
  item_id    text not null,
  position   int  not null default 0,
  completed  boolean not null default false,
  primary key (plan_id, item_id)
);

comment on table public.prep_plan_items is 'Ordered problem items within a prep plan; item_id is an opaque frontend catalog id.';

create index if not exists prep_plans_owner_idx on public.prep_plans (owner_profile_id, created_at desc);
create index if not exists prep_plan_items_plan_idx on public.prep_plan_items (plan_id, position);
