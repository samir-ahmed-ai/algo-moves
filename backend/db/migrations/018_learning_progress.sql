-- User-scoped learner state: per-problem progress, FSRS review schedule, an
-- append-only attempt log, notes, bookmarks, course enrollments, lesson-read
-- markers, assessment results, and an optional analytics event stream.
--
-- All state is keyed on profile_id (a real, non-anonymous profile — server sync is
-- auth-only; guests stay localStorage-only). problem_id / item_id / course_id /
-- checkpoint_id are OPAQUE frontend catalog ids with NO foreign key to the content
-- tables: the catalog is a frontend/build-time concept whose ids do not map 1-to-1
-- to seeded content rows (same decision as prep_plan_items.item_id).
--
-- Every table carries updated_at so the offline-first client can do last-write-wins
-- / monotonic merge on sign-in. All DDL is idempotent and additive (no down path),
-- so it re-runs safely on every deploy.

-- Per-problem aggregate stats (server mirror of the client ProblemStat). Merged
-- monotonically on write so counters never regress across devices.
create table if not exists public.problem_progress (
  profile_id      uuid not null references public.profiles (id) on delete cascade,
  problem_id      text not null,
  attempts        int  not null default 0 check (attempts >= 0),
  correct         int  not null default 0 check (correct >= 0 and correct <= attempts),
  streak          int  not null default 0 check (streak >= 0),
  best_streak     int  not null default 0 check (best_streak >= 0),
  mastered        boolean not null default false,
  last_attempt_at timestamptz,
  updated_at      timestamptz not null default now(),
  primary key (profile_id, problem_id)
);
create index if not exists problem_progress_profile_idx
  on public.problem_progress (profile_id, updated_at desc);

-- FSRS spaced-repetition schedule. `fsrs` holds the ts-fsrs Card blob (Dates as ISO
-- strings, identical to the localStorage JSON); due/interval/reps are promoted to
-- columns so the due-queue is a plain indexed query.
create table if not exists public.review_schedule (
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  problem_id    text not null,
  due           timestamptz not null,
  interval_days int  not null default 0 check (interval_days >= 0),
  reps          int  not null default 0 check (reps >= 0),
  fsrs          jsonb not null default '{}'::jsonb,
  updated_at    timestamptz not null default now(),
  primary key (profile_id, problem_id)
);
create index if not exists review_schedule_due_idx
  on public.review_schedule (profile_id, due);

-- Append-only attempt log (analytics + the mistakes feed). `id` is client-generated
-- so replays are idempotent (insert ... on conflict (id) do nothing).
create table if not exists public.problem_attempts (
  id          uuid primary key,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  problem_id  text not null,
  kind        text not null check (kind in ('quiz','reassemble','recall')),
  correct     boolean not null,
  duration_ms int check (duration_ms >= 0),
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists problem_attempts_profile_idx
  on public.problem_attempts (profile_id, created_at desc);
create index if not exists problem_attempts_problem_idx
  on public.problem_attempts (profile_id, problem_id, created_at desc);

-- Per-item free-form notes. `kind` discriminates the NOTES vs EDGE_CASES client keys.
create table if not exists public.learning_notes (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  item_id    text not null,
  kind       text not null default 'note' check (kind in ('note','edge_cases')),
  body       text not null default '',
  updated_at timestamptz not null default now(),
  primary key (profile_id, item_id, kind)
);
create index if not exists learning_notes_profile_idx
  on public.learning_notes (profile_id, updated_at desc);

-- Bookmarks / favorites. Written as a full-set replace (delete-all + insert in a tx)
-- so a removal on one device propagates without tombstones.
create table if not exists public.bookmarks (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  item_id    text not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, item_id)
);

-- Course enrollment + resume position + completion.
create table if not exists public.course_enrollments (
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  course_id    text not null,
  enrolled_at  timestamptz not null default now(),
  last_item_id text,
  progress     real not null default 0 check (progress >= 0 and progress <= 1),
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (profile_id, course_id)
);

-- Lesson "read" completion markers (Phase 4 reading layer).
create table if not exists public.lesson_reads (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  item_id    text not null,
  read_at    timestamptz not null default now(),
  primary key (profile_id, item_id)
);

-- Graded assessment / checkpoint results (Phase 5).
create table if not exists public.assessment_results (
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  checkpoint_id text not null,
  best_pct      int  not null default 0 check (best_pct >= 0 and best_pct <= 100),
  attempts      int  not null default 0 check (attempts >= 0),
  passed_at     timestamptz,
  updated_at    timestamptz not null default now(),
  primary key (profile_id, checkpoint_id)
);

-- Optional generic analytics event stream (append-only).
create table if not exists public.study_events (
  id         uuid primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind       text not null,
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists study_events_profile_idx
  on public.study_events (profile_id, created_at desc);
