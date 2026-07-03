package arcade

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"
)

// Learning content is public, read-only data (courses, topics, problems, per-
// language solutions, quizzes) mirrored from the frontend catalog by
// scripts/export-content-sql.mts. These GET endpoints require no auth, mirroring
// the public leaderboard/canvas reads.

type ContentItem struct {
	ID         string  `json:"id"`
	Kind       string  `json:"kind"`
	ProblemID  *string `json:"problemId,omitempty"`
	Title      string  `json:"title"`
	Difficulty *string `json:"difficulty,omitempty"`
}

type ContentTopic struct {
	ID      string        `json:"id"`
	Title   string        `json:"title"`
	Summary string        `json:"summary,omitempty"`
	Items   []ContentItem `json:"items"`
}

type ContentCourse struct {
	ID           string         `json:"id"`
	Title        string         `json:"title"`
	Summary      string         `json:"summary,omitempty"`
	Icon         string         `json:"icon,omitempty"`
	Group        string         `json:"group"`
	Family       string         `json:"family"`
	ProblemCount int            `json:"problemCount"`
	Topics       []ContentTopic `json:"topics"`
}

// ContentCatalog returns the whole course/topic/item spine (metadata only, no
// solution code) in sidebar order.
func (s *Store) ContentCatalog(ctx context.Context) ([]ContentCourse, error) {
	courseRows, err := s.pool.Query(ctx, `
		select id, title, coalesce(summary,''), coalesce(icon,''), "group", family,
		       (select count(*) from public.items i where i.course_id = c.id and i.kind = 'problem')
		from public.courses c order by sort_order, id`)
	if err != nil {
		return nil, err
	}
	defer courseRows.Close()

	var courses []ContentCourse
	index := map[string]int{}
	for courseRows.Next() {
		var c ContentCourse
		if err := courseRows.Scan(&c.ID, &c.Title, &c.Summary, &c.Icon, &c.Group, &c.Family, &c.ProblemCount); err != nil {
			return nil, err
		}
		c.Topics = []ContentTopic{}
		index[c.ID] = len(courses)
		courses = append(courses, c)
	}
	if err := courseRows.Err(); err != nil {
		return nil, err
	}

	topicRows, err := s.pool.Query(ctx, `
		select id, course_id, title, coalesce(summary,'')
		from public.topics order by course_id, sort_order, id`)
	if err != nil {
		return nil, err
	}
	defer topicRows.Close()

	topicIndex := map[string]struct{ course, topic int }{}
	for topicRows.Next() {
		var id, courseID, title, summary string
		if err := topicRows.Scan(&id, &courseID, &title, &summary); err != nil {
			return nil, err
		}
		ci, ok := index[courseID]
		if !ok {
			continue
		}
		courses[ci].Topics = append(courses[ci].Topics, ContentTopic{ID: id, Title: title, Summary: summary, Items: []ContentItem{}})
		topicIndex[id] = struct{ course, topic int }{ci, len(courses[ci].Topics) - 1}
	}
	if err := topicRows.Err(); err != nil {
		return nil, err
	}

	itemRows, err := s.pool.Query(ctx, `
		select id, topic_id, kind, problem_id, coalesce(title,''), difficulty
		from public.items order by topic_id, sort_order, id`)
	if err != nil {
		return nil, err
	}
	defer itemRows.Close()

	for itemRows.Next() {
		var it ContentItem
		var topicID *string
		if err := itemRows.Scan(&it.ID, &topicID, &it.Kind, &it.ProblemID, &it.Title, &it.Difficulty); err != nil {
			return nil, err
		}
		if topicID == nil {
			continue
		}
		loc, ok := topicIndex[*topicID]
		if !ok {
			continue
		}
		courses[loc.course].Topics[loc.topic].Items = append(courses[loc.course].Topics[loc.topic].Items, it)
	}
	return courses, itemRows.Err()
}

type ContentSolution struct {
	Language  string `json:"language"`
	File      string `json:"file"`
	Code      string `json:"code"`
	IsPrimary bool   `json:"isPrimary"`
}

type ContentChoice struct {
	Label     string `json:"label"`
	IsCorrect bool   `json:"isCorrect"`
}

type ContentQuestion struct {
	ID      string          `json:"id"`
	Prompt  string          `json:"prompt"`
	Explain string          `json:"explain,omitempty"`
	Choices []ContentChoice `json:"choices"`
}

type ContentProblem struct {
	ID         string            `json:"id"`
	Title      string            `json:"title"`
	Difficulty string            `json:"difficulty"`
	Summary    string            `json:"summary,omitempty"`
	Pattern    string            `json:"pattern,omitempty"`
	SourceURL  string            `json:"sourceUrl,omitempty"`
	Tags       []string          `json:"tags"`
	Solutions  []ContentSolution `json:"solutions"`
	Quiz       []ContentQuestion `json:"quiz"`
}

// ContentProblemByID returns a full problem with its tags, per-language solutions
// and quiz. Returns (nil, nil) when the id does not exist.
func (s *Store) ContentProblemByID(ctx context.Context, id string) (*ContentProblem, error) {
	var p ContentProblem
	err := s.pool.QueryRow(ctx, `
		select id, title, difficulty, coalesce(summary,''), coalesce(pattern,''), coalesce(source_url,'')
		from public.problems where id = $1`, id).
		Scan(&p.ID, &p.Title, &p.Difficulty, &p.Summary, &p.Pattern, &p.SourceURL)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	p.Tags = []string{}
	p.Solutions = []ContentSolution{}
	p.Quiz = []ContentQuestion{}

	tagRows, err := s.pool.Query(ctx, `select tag_id from public.problem_tags where problem_id = $1 order by tag_id`, id)
	if err != nil {
		return nil, err
	}
	defer tagRows.Close()
	for tagRows.Next() {
		var t string
		if err := tagRows.Scan(&t); err != nil {
			return nil, err
		}
		p.Tags = append(p.Tags, t)
	}
	if err := tagRows.Err(); err != nil {
		return nil, err
	}

	solRows, err := s.pool.Query(ctx, `
		select language, file, code, is_primary from public.solutions
		where problem_id = $1 order by is_primary desc, language, sort_order`, id)
	if err != nil {
		return nil, err
	}
	defer solRows.Close()
	for solRows.Next() {
		var sol ContentSolution
		if err := solRows.Scan(&sol.Language, &sol.File, &sol.Code, &sol.IsPrimary); err != nil {
			return nil, err
		}
		p.Solutions = append(p.Solutions, sol)
	}
	if err := solRows.Err(); err != nil {
		return nil, err
	}

	qRows, err := s.pool.Query(ctx, `
		select id, prompt, coalesce(explain,'') from public.quiz_questions
		where problem_id = $1 order by sort_order, id`, id)
	if err != nil {
		return nil, err
	}
	defer qRows.Close()
	qIndex := map[string]int{}
	for qRows.Next() {
		var qq ContentQuestion
		if err := qRows.Scan(&qq.ID, &qq.Prompt, &qq.Explain); err != nil {
			return nil, err
		}
		qq.Choices = []ContentChoice{}
		qIndex[qq.ID] = len(p.Quiz)
		p.Quiz = append(p.Quiz, qq)
	}
	if err := qRows.Err(); err != nil {
		return nil, err
	}

	if len(p.Quiz) > 0 {
		chRows, err := s.pool.Query(ctx, `
			select ch.question_id, ch.label, ch.is_correct
			from public.quiz_choices ch
			join public.quiz_questions q on q.id = ch.question_id
			where q.problem_id = $1 order by ch.question_id, ch.sort_order`, id)
		if err != nil {
			return nil, err
		}
		defer chRows.Close()
		for chRows.Next() {
			var qid string
			var ch ContentChoice
			if err := chRows.Scan(&qid, &ch.Label, &ch.IsCorrect); err != nil {
				return nil, err
			}
			if i, ok := qIndex[qid]; ok {
				p.Quiz[i].Choices = append(p.Quiz[i].Choices, ch)
			}
		}
		if err := chRows.Err(); err != nil {
			return nil, err
		}
	}

	return &p, nil
}

// handleContentCatalog: GET /api/content/catalog — the full course/topic/item tree.
func (s *Service) handleContentCatalog(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	courses, err := s.store.ContentCatalog(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "query failed")
		return
	}
	if courses == nil {
		courses = []ContentCourse{}
	}
	writeJSON(w, http.StatusOK, courses)
}

// handleContentProblem: GET /api/content/problems/{id} — one problem with
// solutions, tags and quiz.
func (s *Service) handleContentProblem(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	id := strings.TrimPrefix(r.URL.Path, "/api/content/problems/")
	if id == "" || strings.Contains(id, "/") {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	p, err := s.store.ContentProblemByID(r.Context(), id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "query failed")
		return
	}
	if p == nil {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	writeJSON(w, http.StatusOK, p)
}
