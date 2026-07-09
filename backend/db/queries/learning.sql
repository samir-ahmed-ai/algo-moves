-- Learner-state queries. Server-side merge lives in the ON CONFLICT clauses so a
-- concurrent push from a second device converges to the same value the client's
-- pure merge produces. Owner-scoped by profile_id on every statement.

-- ---------------------------------------------------------------- problem_progress

-- name: ListProblemProgress :many
select problem_id, attempts, correct, streak, best_streak, mastered, last_attempt_at, updated_at
from public.problem_progress
where profile_id = sqlc.arg(profile_id)::uuid
order by updated_at desc;

-- name: UpsertProblemProgress :one
-- Field-wise monotonic merge: counters take the max, mastered latches, streak +
-- last_attempt_at come from whichever side attempted most recently.
insert into public.problem_progress
  (profile_id, problem_id, attempts, correct, streak, best_streak, mastered, last_attempt_at, updated_at)
values
  (sqlc.arg(profile_id)::uuid, sqlc.arg(problem_id), sqlc.arg(attempts), sqlc.arg(correct),
   sqlc.arg(streak), sqlc.arg(best_streak), sqlc.arg(mastered), sqlc.arg(last_attempt_at), now())
on conflict (profile_id, problem_id) do update set
  attempts        = greatest(public.problem_progress.attempts, excluded.attempts),
  correct         = least(
                      greatest(public.problem_progress.correct, excluded.correct),
                      greatest(public.problem_progress.attempts, excluded.attempts)),
  best_streak     = greatest(public.problem_progress.best_streak, excluded.best_streak),
  mastered        = public.problem_progress.mastered or excluded.mastered,
  streak          = case
                      when excluded.last_attempt_at is not null
                       and (public.problem_progress.last_attempt_at is null
                            or excluded.last_attempt_at >= public.problem_progress.last_attempt_at)
                      then excluded.streak
                      else public.problem_progress.streak end,
  last_attempt_at = greatest(public.problem_progress.last_attempt_at, excluded.last_attempt_at),
  updated_at      = now()
returning problem_id, attempts, correct, streak, best_streak, mastered, last_attempt_at, updated_at;

-- ---------------------------------------------------------------- review_schedule

-- name: ListReviewSchedule :many
select problem_id, due, interval_days, reps, fsrs, updated_at
from public.review_schedule
where profile_id = sqlc.arg(profile_id)::uuid
order by due asc;

-- name: ListDueReviews :many
select problem_id, due, interval_days, reps, fsrs, updated_at
from public.review_schedule
where profile_id = sqlc.arg(profile_id)::uuid and due <= sqlc.arg(at)
order by due asc
limit sqlc.arg(lim);

-- name: UpsertReviewCard :one
-- Higher reps wins; tie -> later due. Mirrors the client mergeSrsCard.
insert into public.review_schedule
  (profile_id, problem_id, due, interval_days, reps, fsrs, updated_at)
values
  (sqlc.arg(profile_id)::uuid, sqlc.arg(problem_id), sqlc.arg(due),
   sqlc.arg(interval_days), sqlc.arg(reps), sqlc.arg(fsrs), now())
on conflict (profile_id, problem_id) do update set
  reps          = greatest(public.review_schedule.reps, excluded.reps),
  due           = case
                    when excluded.reps > public.review_schedule.reps then excluded.due
                    when excluded.reps < public.review_schedule.reps then public.review_schedule.due
                    else greatest(public.review_schedule.due, excluded.due) end,
  interval_days = case when excluded.reps >= public.review_schedule.reps
                       then excluded.interval_days else public.review_schedule.interval_days end,
  fsrs          = case when excluded.reps >= public.review_schedule.reps
                       then excluded.fsrs else public.review_schedule.fsrs end,
  updated_at    = now()
returning problem_id, due, interval_days, reps, fsrs, updated_at;

-- ---------------------------------------------------------------- problem_attempts

-- name: InsertProblemAttempt :exec
insert into public.problem_attempts (id, profile_id, problem_id, kind, correct, duration_ms, detail)
values (sqlc.arg(id)::uuid, sqlc.arg(profile_id)::uuid, sqlc.arg(problem_id),
        sqlc.arg(kind), sqlc.arg(correct), sqlc.arg(duration_ms), sqlc.arg(detail))
on conflict (id) do nothing;

-- name: ListRecentMistakes :many
select id::text as id, problem_id, kind, correct, duration_ms, detail, created_at
from public.problem_attempts
where profile_id = sqlc.arg(profile_id)::uuid and correct = false
order by created_at desc
limit sqlc.arg(lim);

-- ---------------------------------------------------------------- learning_notes

-- name: ListNotes :many
select item_id, kind, body, updated_at
from public.learning_notes
where profile_id = sqlc.arg(profile_id)::uuid
order by updated_at desc;

-- name: UpsertNote :one
insert into public.learning_notes (profile_id, item_id, kind, body, updated_at)
values (sqlc.arg(profile_id)::uuid, sqlc.arg(item_id), sqlc.arg(kind), sqlc.arg(body), sqlc.arg(updated_at))
on conflict (profile_id, item_id, kind) do update set
  body       = excluded.body,
  updated_at = greatest(public.learning_notes.updated_at, excluded.updated_at)
returning item_id, kind, body, updated_at;

-- name: DeleteNote :execrows
delete from public.learning_notes
where profile_id = sqlc.arg(profile_id)::uuid and item_id = sqlc.arg(item_id) and kind = sqlc.arg(kind);

-- ---------------------------------------------------------------- bookmarks

-- name: ListBookmarks :many
select item_id
from public.bookmarks
where profile_id = sqlc.arg(profile_id)::uuid
order by created_at desc;

-- name: DeleteBookmarksForOwner :exec
delete from public.bookmarks where profile_id = sqlc.arg(profile_id)::uuid;

-- name: InsertBookmark :exec
insert into public.bookmarks (profile_id, item_id)
values (sqlc.arg(profile_id)::uuid, sqlc.arg(item_id))
on conflict (profile_id, item_id) do nothing;

-- ---------------------------------------------------------------- course_enrollments

-- name: ListEnrollments :many
select course_id, enrolled_at, last_item_id, progress, completed_at, updated_at
from public.course_enrollments
where profile_id = sqlc.arg(profile_id)::uuid
order by updated_at desc;

-- name: UpsertEnrollment :one
insert into public.course_enrollments
  (profile_id, course_id, last_item_id, progress, completed_at, updated_at)
values
  (sqlc.arg(profile_id)::uuid, sqlc.arg(course_id), sqlc.arg(last_item_id),
   sqlc.arg(progress), sqlc.arg(completed_at), now())
on conflict (profile_id, course_id) do update set
  last_item_id = coalesce(excluded.last_item_id, public.course_enrollments.last_item_id),
  progress     = greatest(public.course_enrollments.progress, excluded.progress),
  completed_at = coalesce(public.course_enrollments.completed_at, excluded.completed_at),
  updated_at   = now()
returning course_id, enrolled_at, last_item_id, progress, completed_at, updated_at;
