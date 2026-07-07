-- name: ContentCourses :many
select
  c.id,
  c.title,
  coalesce(c.summary, '') as summary,
  coalesce(c.icon, '') as icon,
  c."group",
  c.family,
  (select count(*)::int from public.items i where i.course_id = c.id and i.kind = 'problem') as problem_count
from public.courses c
order by c.sort_order, c.id;

-- name: ContentTopics :many
select id, course_id, title, coalesce(summary, '') as summary
from public.topics
order by course_id, sort_order, id;

-- name: ContentItems :many
select id, topic_id, kind, problem_id, coalesce(title, '') as title, difficulty
from public.items
order by topic_id, sort_order, id;

-- name: ContentProblemByID :one
select
  p.id,
  p.title,
  p.difficulty,
  coalesce(p.summary, '') as summary,
  coalesce(p.pattern, '') as pattern,
  coalesce(p.source_url, '') as source_url,
  coalesce(p.narrative, '') as narrative,
  coalesce(p.region_id, '') as region_id,
  coalesce(r.title, '') as region_title
from public.problems p
left join public.story_regions r on r.id = p.region_id
where p.id = sqlc.arg(id);

-- name: ContentProblemTags :many
select tag_id
from public.problem_tags
where problem_id = sqlc.arg(problem_id)
order by tag_id;

-- name: ContentProblemSolutions :many
select language, file, code, is_primary
from public.solutions
where problem_id = sqlc.arg(problem_id)
order by is_primary desc, language, sort_order;

-- name: ContentProblemQuizQuestions :many
select id, prompt, coalesce(explain, '') as explain
from public.quiz_questions
where problem_id = sqlc.arg(problem_id)
order by sort_order, id;

-- name: ContentProblemQuizChoices :many
select ch.question_id, ch.label, ch.is_correct
from public.quiz_choices ch
join public.quiz_questions q on q.id = ch.question_id
where q.problem_id = sqlc.arg(problem_id)
order by ch.question_id, ch.sort_order;
