package resume

import (
	"encoding/json"
	"testing"
)

func TestReorderMappingForFocus_pythonSkillFirst(t *testing.T) {
	mapping := Mapping{
		Contact: Contact{Name: "Test"},
		Skills: []Skill{
			{Name: "Java", Tags: []string{"java"}, Weight: 1},
			{Name: "Python", Tags: []string{"python"}, Weight: 1},
			{Name: "Go", Tags: []string{"go"}, Weight: 1},
		},
		Experience: []Experience{
			{
				Company: "A",
				Role:    "Engineer",
				Bullets: []Bullet{
					{Text: "Built Java services", Tags: []string{"java"}},
					{Text: "Led Python ML pipeline", Tags: []string{"python", "ml"}},
				},
			},
		},
	}
	raw, err := json.Marshal(mapping)
	if err != nil {
		t.Fatal(err)
	}

	out, err := ReorderMappingForFocus(raw, "python")
	if err != nil {
		t.Fatal(err)
	}
	var result Mapping
	if err := json.Unmarshal(out, &result); err != nil {
		t.Fatal(err)
	}

	if result.Skills[0].Name != "Python" {
		t.Fatalf("expected Python skill first, got %q", result.Skills[0].Name)
	}
	if result.Experience[0].Bullets[0].Text != "Led Python ML pipeline" {
		t.Fatalf("expected python bullet first, got %q", result.Experience[0].Bullets[0].Text)
	}
}

func TestReorderMappingForFocus_emptyFocusNoChange(t *testing.T) {
	raw := json.RawMessage(`{"contact":{},"summary":"","skills":[],"experience":[],"projects":[],"education":[],"certifications":[]}`)
	out, err := ReorderMappingForFocus(raw, "  ")
	if err != nil {
		t.Fatal(err)
	}
	if string(out) != string(raw) {
		t.Fatalf("expected unchanged mapping for empty focus")
	}
}
