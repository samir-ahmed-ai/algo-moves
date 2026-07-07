-- Email/password accounts and platform admin role.

alter table public.profiles
  add column if not exists email text unique,
  add column if not exists password_hash text,
  add column if not exists is_admin boolean not null default false;

create index if not exists profiles_email_idx on public.profiles (email);

comment on column public.profiles.email is 'Unique login email; null for guest-only profiles.';
comment on column public.profiles.password_hash is 'bcrypt hash; null for guest-only profiles.';
comment on column public.profiles.is_admin is 'Platform admin; set via PLATFORM_ADMIN_EMAIL on server start.';
