package arcade

import (
	"context"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgtype"
)

// Learning content is public, read-only data mirrored from the frontend catalog.

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
	ID          string            `json:"id"`
	Title       string            `json:"title"`
	Difficulty  string            `json:"difficulty"`
	Summary     string            `json:"summary,omitempty"`
	Pattern     string            `json:"pattern,omitempty"`
	SourceURL   string            `json:"sourceUrl,omitempty"`
	Narrative   string            `json:"narrative,omitempty"`
	RegionID    string            `json:"regionId,omitempty"`
	RegionTitle string            `json:"regionTitle,omitempty"`
	Tags        []string          `json:"tags"`
	Solutions   []ContentSolution `json:"solutions"`
	Quiz        []ContentQuestion `json:"quiz"`
}

// ContentCatalog returns the whole course/topic/item spine (metadata only, no
// solution code) in sidebar order.
func (s *Store) ContentCatalog(ctx context.Context) ([]ContentCourse, error) {
	courseRows, err := s.q.ContentCourses(ctx)
	if err != nil {
		return nil, err
	}

	var courses []ContentCourse
	index := map[string]int{}
	for _, row := range courseRows {
		c := ContentCourse{
			ID:           row.ID,
			Title:        row.Title,
			Summary:      row.Summary,
			Icon:         row.Icon,
			Group:        row.Group,
			Family:       row.Family,
			ProblemCount: int(row.ProblemCount),
			Topics:       []ContentTopic{},
		}
		index[c.ID] = len(courses)
		courses = append(courses, c)
	}

	topicRows, err := s.q.ContentTopics(ctx)
	if err != nil {
		return nil, err
	}

	topicIndex := map[string]struct{ course, topic int }{}
	for _, row := range topicRows {
		ci, ok := index[row.CourseID]
		if !ok {
			continue
		}
		courses[ci].Topics = append(courses[ci].Topics, ContentTopic{
			ID:      row.ID,
			Title:   row.Title,
			Summary: row.Summary,
			Items:   []ContentItem{},
		})
		topicIndex[row.ID] = struct{ course, topic int }{ci, len(courses[ci].Topics) - 1}
	}

	itemRows, err := s.q.ContentItems(ctx)
	if err != nil {
		return nil, err
	}

	for _, row := range itemRows {
		if !row.TopicID.Valid {
			continue
		}
		topicID := row.TopicID.String
		loc, ok := topicIndex[topicID]
		if !ok {
			continue
		}
		it := ContentItem{
			ID:    row.ID,
			Kind:  row.Kind,
			Title: row.Title,
		}
		if row.ProblemID.Valid {
			s := row.ProblemID.String
			it.ProblemID = &s
		}
		if row.Difficulty.Valid {
			s := row.Difficulty.String
			it.Difficulty = &s
		}
		courses[loc.course].Topics[loc.topic].Items = append(courses[loc.course].Topics[loc.topic].Items, it)
	}
	return courses, nil
}

// ContentProblemByID returns a full problem with its tags, per-language solutions
// and quiz. Returns (nil, nil) when the id does not exist.
func (s *Store) ContentProblemByID(ctx context.Context, id string) (*ContentProblem, error) {
	row, err := s.q.ContentProblemByID(ctx, id)
	if isNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	p := ContentProblem{
		ID:          row.ID,
		Title:       row.Title,
		Difficulty:  row.Difficulty,
		Summary:     row.Summary,
		Pattern:     row.Pattern,
		SourceURL:   row.SourceUrl,
		Narrative:   row.Narrative,
		RegionID:    row.RegionID,
		RegionTitle: row.RegionTitle,
		Tags:        []string{},
		Solutions:   []ContentSolution{},
		Quiz:        []ContentQuestion{},
	}

	tags, err := s.q.ContentProblemTags(ctx, id)
	if err != nil {
		return nil, err
	}
	p.Tags = tags

	sols, err := s.q.ContentProblemSolutions(ctx, id)
	if err != nil {
		return nil, err
	}
	for _, sol := range sols {
		p.Solutions = append(p.Solutions, ContentSolution{
			Language:  sol.Language,
			File:      sol.File,
			Code:      sol.Code,
			IsPrimary: sol.IsPrimary,
		})
	}

	questions, err := s.q.ContentProblemQuizQuestions(ctx, pgtype.Text{String: id, Valid: true})
	if err != nil {
		return nil, err
	}
	qIndex := map[string]int{}
	for _, qq := range questions {
		qIndex[qq.ID] = len(p.Quiz)
		p.Quiz = append(p.Quiz, ContentQuestion{
			ID:      qq.ID,
			Prompt:  qq.Prompt,
			Explain: qq.Explain,
			Choices: []ContentChoice{},
		})
	}

	if len(p.Quiz) > 0 {
		choices, err := s.q.ContentProblemQuizChoices(ctx, pgtype.Text{String: id, Valid: true})
		if err != nil {
			return nil, err
		}
		for _, ch := range choices {
			if i, ok := qIndex[ch.QuestionID]; ok {
				p.Quiz[i].Choices = append(p.Quiz[i].Choices, ContentChoice{
					Label:     ch.Label,
					IsCorrect: ch.IsCorrect,
				})
			}
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
