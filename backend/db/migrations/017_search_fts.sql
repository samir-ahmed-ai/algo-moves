-- Full-text search vectors for user-owned discovery surfaces.
-- Uses generated tsvector columns + GIN indexes; pg_trgm for short/typo fallback.

create extension if not exists pg_trgm;

alter table public.prep_plans
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(notes, '')), 'B')
  ) stored;

create index if not exists prep_plans_search_idx on public.prep_plans using gin (search_vector);
create index if not exists prep_plans_title_trgm_idx on public.prep_plans using gin (title gin_trgm_ops);

alter table public.resumes
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(original_filename, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(left(raw_text, 8000), '')), 'C')
  ) stored;

create index if not exists resumes_search_idx on public.resumes using gin (search_vector);
create index if not exists resumes_title_trgm_idx on public.resumes using gin (title gin_trgm_ops);

alter table public.interview_sessions
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(notes, '')), 'B')
  ) stored;

create index if not exists interview_sessions_search_idx on public.interview_sessions using gin (search_vector);
create index if not exists interview_sessions_title_trgm_idx on public.interview_sessions using gin (title gin_trgm_ops);

alter table public.canvases
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A')
  ) stored;

create index if not exists canvases_search_idx on public.canvases using gin (search_vector);
create index if not exists canvases_title_trgm_idx on public.canvases using gin (title gin_trgm_ops);

alter table public.games
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A')
  ) stored;

create index if not exists games_search_idx on public.games using gin (search_vector);
create index if not exists games_title_trgm_idx on public.games using gin (title gin_trgm_ops);
