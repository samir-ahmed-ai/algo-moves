-- Resume uploads and structured mappings for template customization.

create table if not exists public.resumes (
  id                uuid primary key default gen_random_uuid(),
  owner_profile_id  uuid not null references public.profiles (id) on delete cascade,
  title             text not null default 'My Resume',
  original_filename text not null default '',
  content_type      text not null default '',
  file_bytes        bytea,
  raw_text          text not null default '',
  mapping           jsonb not null default '{}'::jsonb,
  is_public         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.resumes is 'User-uploaded resume with AI-parsed structured mapping for customization.';

create table if not exists public.resume_variants (
  id               uuid primary key default gen_random_uuid(),
  resume_id        uuid not null references public.resumes (id) on delete cascade,
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  label            text not null default '',
  focus            text not null default '',
  target_role      text not null default '',
  mode             text not null default 'rules' check (mode in ('rules', 'ai')),
  mapping          jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

comment on table public.resume_variants is 'Saved customized resume variant generated from a base resume mapping.';

create index if not exists resumes_owner_idx on public.resumes (owner_profile_id, created_at desc);
create index if not exists resumes_public_idx on public.resumes (created_at desc) where is_public = true;
create index if not exists resume_variants_resume_idx on public.resume_variants (resume_id, created_at desc);
