-- Stable personal room code per profile (guest or signed-in).
-- Used so each player always has the same invite code on this browser / account.

alter table public.profiles
  add column if not exists personal_room_code text unique;

update public.profiles
set personal_room_code = upper(substr(md5(id::text), 1, 6))
where personal_room_code is null;

comment on column public.profiles.personal_room_code is
  'Stable room code for this profile; friends can always join via this code.';
