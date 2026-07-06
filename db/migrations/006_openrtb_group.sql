-- Migration 006: extend courses."group" check constraint to include 'openrtb'.
--
-- The courses table was created in 004_content_schema.sql with a check constraint
-- that lists allowed group values. Adding a new plugin group requires the constraint
-- to be updated. PostgreSQL does not support ALTER CONSTRAINT; we must drop and
-- recreate it.
--
-- This migration is idempotent: the constraint is dropped only if it exists, and
-- recreated with the full updated list of allowed values.

do $$
begin
  -- Drop the existing group check constraint if present.
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.courses'::regclass
      and contype = 'c'
      and conname = 'courses_group_check'
  ) then
    alter table public.courses drop constraint courses_group_check;
  end if;

  -- Add the updated constraint that includes 'openrtb'.
  alter table public.courses
    add constraint courses_group_check
    check ("group" in ('curated', 'imported', 'prep', 'go-course', 'openrtb'));
end
$$;

comment on column public.courses."group" is
  'Plugin group: curated | imported | prep | go-course | openrtb';
