package arcade

import (
	"encoding/json"
	"sort"
	"strings"
)

// ResumeMapping is the structured resume document used for customization.
type ResumeMapping struct {
	Contact        ResumeContact        `json:"contact"`
	Summary        string               `json:"summary"`
	Skills         []ResumeSkill        `json:"skills"`
	Experience     []ResumeExperience   `json:"experience"`
	Projects       []ResumeProject      `json:"projects"`
	Education      []ResumeEducation    `json:"education"`
	Certifications []string             `json:"certifications"`
}

type ResumeContact struct {
	Name     string   `json:"name"`
	Email    string   `json:"email"`
	Phone    string   `json:"phone"`
	Location string   `json:"location"`
	Links    []string `json:"links"`
}

type ResumeSkill struct {
	Name     string   `json:"name"`
	Category string   `json:"category"`
	Tags     []string `json:"tags"`
	Weight   float64  `json:"weight"`
}

type ResumeBullet struct {
	Text string   `json:"text"`
	Tags []string `json:"tags"`
}

type ResumeExperience struct {
	Company string         `json:"company"`
	Role    string         `json:"role"`
	Start   string         `json:"start"`
	End     string         `json:"end"`
	Bullets []ResumeBullet `json:"bullets"`
}

type ResumeProject struct {
	Name    string         `json:"name"`
	Tags    []string       `json:"tags"`
	Bullets []ResumeBullet `json:"bullets"`
}

type ResumeEducation struct {
	School  string `json:"school"`
	Degree  string `json:"degree"`
	Start   string `json:"start"`
	End     string `json:"end"`
	Details string `json:"details"`
}

// ReorderMappingForFocus applies rule-based emphasis for a focus keyword.
func ReorderMappingForFocus(mapping json.RawMessage, focus string) (json.RawMessage, error) {
	var m ResumeMapping
	if err := json.Unmarshal(mapping, &m); err != nil {
		return nil, err
	}
	focus = strings.ToLower(strings.TrimSpace(focus))
	if focus == "" {
		return mapping, nil
	}

	// Boost matching skills
	for i := range m.Skills {
		score := tagScore(m.Skills[i].Tags, m.Skills[i].Name, focus)
		m.Skills[i].Weight = m.Skills[i].Weight + score*2
	}
	sort.SliceStable(m.Skills, func(i, j int) bool {
		return m.Skills[i].Weight > m.Skills[j].Weight
	})

	// Reorder experience bullets
	for i := range m.Experience {
		sort.SliceStable(m.Experience[i].Bullets, func(a, b int) bool {
			return bulletScore(m.Experience[i].Bullets[a], focus) > bulletScore(m.Experience[i].Bullets[b], focus)
		})
	}
	sort.SliceStable(m.Experience, func(i, j int) bool {
		return expScore(m.Experience[i], focus) > expScore(m.Experience[j], focus)
	})

	// Reorder projects
	for i := range m.Projects {
		sort.SliceStable(m.Projects[i].Bullets, func(a, b int) bool {
			return bulletScore(m.Projects[i].Bullets[a], focus) > bulletScore(m.Projects[i].Bullets[b], focus)
		})
	}
	sort.SliceStable(m.Projects, func(i, j int) bool {
		return projectScore(m.Projects[i], focus) > projectScore(m.Projects[j], focus)
	})

	return json.Marshal(m)
}

func tagScore(tags []string, name, focus string) float64 {
	score := 0.0
	lowerName := strings.ToLower(name)
	if strings.Contains(lowerName, focus) {
		score += 2
	}
	for _, t := range tags {
		lt := strings.ToLower(t)
		if lt == focus || strings.Contains(lt, focus) {
			score += 3
		}
	}
	return score
}

func bulletScore(b ResumeBullet, focus string) float64 {
	score := 0.0
	lt := strings.ToLower(b.Text)
	if strings.Contains(lt, focus) {
		score += 2
	}
	for _, t := range b.Tags {
		tag := strings.ToLower(t)
		if tag == focus || strings.Contains(tag, focus) {
			score += 3
		}
	}
	return score
}

func expScore(e ResumeExperience, focus string) float64 {
	score := 0.0
	if strings.Contains(strings.ToLower(e.Role), focus) {
		score += 2
	}
	for _, b := range e.Bullets {
		score += bulletScore(b, focus)
	}
	return score
}

func projectScore(p ResumeProject, focus string) float64 {
	score := 0.0
	if strings.Contains(strings.ToLower(p.Name), focus) {
		score += 2
	}
	for _, t := range p.Tags {
		if strings.Contains(strings.ToLower(t), focus) {
			score += 2
		}
	}
	for _, b := range p.Bullets {
		score += bulletScore(b, focus)
	}
	return score
}
