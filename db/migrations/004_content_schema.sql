-- Learning content: courses, topics, catalog items, problems, per-language
-- solutions, tags, quizzes, and (for reimagined narrative courses) story regions.
--
-- Content is public, read-mostly data served at /api/content. It is authored in
-- the frontend TypeScript catalog today and mirrored into these tables by the
-- seed exporter (frontend/scripts/export-content-sql.mts -> db/content_seed.sql).
--
-- All DDL is idempotent (create ... if not exists) and additive, so it re-runs
-- safely on every deploy alongside the arcade migrations. There is no down path.

-- A course groups topics of problems (e.g. 'graphs', 'prep-arrays', 'go-senior').
create table if not exists public.courses (
  id          text primary key,                 -- reuse the TS CourseDef.id
  title       text not null,
  summary     text,
  icon        text,
  "group"     text not null default 'curated'
                check ("group" in ('curated','imported','prep','go-course')),
  family      text not null default 'Other'
                check (family in ('DataStructures','Algorithms','Design','Go','Other')),
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.courses is 'Learning courses mirrored from the frontend catalog.';

-- A narrative world layered over a course (e.g. Graphs -> "The Archipelago of
-- Reach"). Each region is a technique cluster the problems are grouped into.
create table if not exists public.story_regions (
  id          text primary key,                 -- e.g. 'archipelago-ripple-shallows'
  course_id   text not null references public.courses (id) on delete cascade,
  code_name   text,                             -- 'Region 1'
  title       text not null,                    -- 'The Ripple Shallows'
  subtitle    text,                             -- technique label e.g. 'BFS · unweighted paths'
  blurb       text,                             -- the vivid description
  sort_order  int  not null default 0
);
create index if not exists story_regions_course_idx on public.story_regions (course_id, sort_order);

-- A topic is a section within a course.
create table if not exists public.topics (
  id          text primary key,
  course_id   text not null references public.courses (id) on delete cascade,
  title       text not null,
  summary     text,
  sort_order  int  not null default 0
);
create index if not exists topics_course_idx on public.topics (course_id, sort_order);

-- A problem is the canonical unit of content. One row per problem regardless of
-- how many languages it is solved in. `region_id`/`narrative` back the reimagining.
create table if not exists public.problems (
  id               text primary key,            -- reuse the plugin/meta id
  title            text not null,
  difficulty       text not null default 'Medium'
                     check (difficulty in ('Easy','Medium','Hard')),
  summary          text,
  pattern          text,
  visual           text,
  time_complexity  text,
  space_complexity text,
  source_url       text,
  region_id        text references public.story_regions (id) on delete set null,
  narrative        text,                         -- story framing for this problem
  extra            jsonb not null default '{}'::jsonb,  -- render-only blobs (code pieces, wires)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists problems_region_idx on public.problems (region_id);
create index if not exists problems_difficulty_idx on public.problems (difficulty);

-- The catalog spine: an item places a problem (or reading/quiz) inside a topic.
create table if not exists public.items (
  id                text primary key,
  course_id         text not null references public.courses (id) on delete cascade,
  topic_id          text references public.topics (id) on delete cascade,
  problem_id        text references public.problems (id) on delete set null,
  kind              text not null default 'problem'
                      check (kind in ('problem','reading','quiz')),
  title             text,
  summary           text,
  difficulty        text check (difficulty in ('Easy','Medium','Hard')),
  estimated_minutes int,
  prereqs           text[] not null default '{}',
  sort_order        int  not null default 0
);
create index if not exists items_topic_idx on public.items (topic_id, sort_order);
create index if not exists items_problem_idx on public.items (problem_id);

-- One row per (problem, language, file). Today mostly Go; multi-language is a
-- pure data add. Upserts target the unique constraint, not the uuid PK.
create table if not exists public.solutions (
  id          uuid primary key default gen_random_uuid(),
  problem_id  text not null references public.problems (id) on delete cascade,
  language    text not null default 'go'
                check (language in ('go','python','java','typescript','javascript','cpp','rust','sql')),
  file        text not null default 'solution',
  code        text not null,
  is_primary  boolean not null default false,
  sort_order  int  not null default 0,
  unique (problem_id, language, file)
);
create index if not exists solutions_problem_idx on public.solutions (problem_id, language);

-- Tags are shared across problems and faceted in the browse UI, so they get a
-- real junction table rather than a text[] on problems.
create table if not exists public.tags (
  id     text primary key,                       -- the tag slug e.g. 'bfs'
  label  text,
  color  text
);

create table if not exists public.problem_tags (
  problem_id text not null references public.problems (id) on delete cascade,
  tag_id     text not null references public.tags (id) on delete cascade,
  primary key (problem_id, tag_id)
);
create index if not exists problem_tags_tag_idx on public.problem_tags (tag_id);

-- Conceptual multiple-choice questions. Relational (not JSONB) so the exactly-
-- one-correct invariant and label formatting can be checked queryably.
create table if not exists public.quiz_questions (
  id          text primary key,                  -- '<problem_id>::<quiz_id>'
  problem_id  text references public.problems (id) on delete cascade,
  prompt      text not null,
  explain     text,
  sort_order  int  not null default 0
);
create index if not exists quiz_questions_problem_idx on public.quiz_questions (problem_id, sort_order);

create table if not exists public.quiz_choices (
  id           text primary key,                 -- '<question_id>#<index>'
  question_id  text not null references public.quiz_questions (id) on delete cascade,
  label        text not null,
  is_correct   boolean not null default false,
  sort_order   int  not null default 0
);
create index if not exists quiz_choices_question_idx on public.quiz_choices (question_id, sort_order);
