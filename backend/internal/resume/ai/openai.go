package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

const openAIURL = "https://api.openai.com/v1/chat/completions"
const defaultModel = "gpt-4o"

// Client calls OpenAI for resume parsing and rewriting.
type Client struct {
	apiKey string
	model  string
	http   *http.Client
}

func NewClient() *Client {
	model := strings.TrimSpace(os.Getenv("OPENAI_MODEL"))
	if model == "" {
		model = defaultModel
	}
	return &Client{
		apiKey: strings.TrimSpace(os.Getenv("OPENAI_API_KEY")),
		model:  model,
		http:   &http.Client{Timeout: 120 * time.Second},
	}
}

// NewClientWithKey returns a client using the given API key (per-user BYOK).
func NewClientWithKey(apiKey string) *Client {
	c := NewClient()
	c.apiKey = strings.TrimSpace(apiKey)
	return c
}

// WithAPIKey returns a copy of the client using the given API key.
func (c *Client) WithAPIKey(apiKey string) *Client {
	if c == nil {
		return NewClientWithKey(apiKey)
	}
	clone := *c
	clone.apiKey = strings.TrimSpace(apiKey)
	return &clone
}

func (c *Client) Enabled() bool {
	return c != nil && c.apiKey != ""
}

type chatRequest struct {
	Model          string          `json:"model"`
	Messages       []chatMessage   `json:"messages"`
	ResponseFormat *responseFormat `json:"response_format,omitempty"`
	Temperature    float64         `json:"temperature"`
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type responseFormat struct {
	Type       string         `json:"type"`
	JSONSchema map[string]any `json:"json_schema"`
}

type chatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

var resumeMappingSchema = map[string]any{
	"type": "object",
	"properties": map[string]any{
		"contact": map[string]any{
			"type": "object",
			"properties": map[string]any{
				"name":     map[string]any{"type": "string"},
				"email":    map[string]any{"type": "string"},
				"phone":    map[string]any{"type": "string"},
				"location": map[string]any{"type": "string"},
				"links":    map[string]any{"type": "array", "items": map[string]any{"type": "string"}},
			},
			"required":             []string{"name", "email", "phone", "location", "links"},
			"additionalProperties": false,
		},
		"summary": map[string]any{"type": "string"},
		"skills": map[string]any{
			"type": "array",
			"items": map[string]any{
				"type": "object",
				"properties": map[string]any{
					"name":     map[string]any{"type": "string"},
					"category": map[string]any{"type": "string"},
					"tags":     map[string]any{"type": "array", "items": map[string]any{"type": "string"}},
					"weight":   map[string]any{"type": "number"},
				},
				"required":             []string{"name", "category", "tags", "weight"},
				"additionalProperties": false,
			},
		},
		"experience": map[string]any{
			"type": "array",
			"items": map[string]any{
				"type": "object",
				"properties": map[string]any{
					"company": map[string]any{"type": "string"},
					"role":    map[string]any{"type": "string"},
					"start":   map[string]any{"type": "string"},
					"end":     map[string]any{"type": "string"},
					"bullets": map[string]any{
						"type": "array",
						"items": map[string]any{
							"type": "object",
							"properties": map[string]any{
								"text": map[string]any{"type": "string"},
								"tags": map[string]any{"type": "array", "items": map[string]any{"type": "string"}},
							},
							"required":             []string{"text", "tags"},
							"additionalProperties": false,
						},
					},
				},
				"required":             []string{"company", "role", "start", "end", "bullets"},
				"additionalProperties": false,
			},
		},
		"projects": map[string]any{
			"type": "array",
			"items": map[string]any{
				"type": "object",
				"properties": map[string]any{
					"name": map[string]any{"type": "string"},
					"tags": map[string]any{"type": "array", "items": map[string]any{"type": "string"}},
					"bullets": map[string]any{
						"type": "array",
						"items": map[string]any{
							"type": "object",
							"properties": map[string]any{
								"text": map[string]any{"type": "string"},
								"tags": map[string]any{"type": "array", "items": map[string]any{"type": "string"}},
							},
							"required":             []string{"text", "tags"},
							"additionalProperties": false,
						},
					},
				},
				"required":             []string{"name", "tags", "bullets"},
				"additionalProperties": false,
			},
		},
		"education": map[string]any{
			"type": "array",
			"items": map[string]any{
				"type": "object",
				"properties": map[string]any{
					"school":  map[string]any{"type": "string"},
					"degree":  map[string]any{"type": "string"},
					"start":   map[string]any{"type": "string"},
					"end":     map[string]any{"type": "string"},
					"details": map[string]any{"type": "string"},
				},
				"required":             []string{"school", "degree", "start", "end", "details"},
				"additionalProperties": false,
			},
		},
		"certifications": map[string]any{
			"type":  "array",
			"items": map[string]any{"type": "string"},
		},
	},
	"required":             []string{"contact", "summary", "skills", "experience", "projects", "education", "certifications"},
	"additionalProperties": false,
}

// ParseResume turns raw resume text into a structured JSON mapping.
func (c *Client) ParseResume(ctx context.Context, rawText string) (json.RawMessage, error) {
	if !c.Enabled() {
		return nil, fmt.Errorf("OPENAI_API_KEY not configured")
	}
	prompt := `Parse this resume into structured JSON. Extract contact info, summary, skills (with lowercase tags like java, python, react, aws), work experience with tagged bullets, projects, education, and certifications. Infer reasonable tags from context. Use empty strings/arrays when data is missing. Resume text:

` + truncate(rawText, 120_000)
	return c.completeJSON(ctx, prompt, "resume_mapping", resumeMappingSchema)
}

// RewriteForFocus rewrites a resume mapping to emphasize the given focus and target role.
func (c *Client) RewriteForFocus(ctx context.Context, mapping json.RawMessage, focus, targetRole string) (json.RawMessage, error) {
	if !c.Enabled() {
		return nil, fmt.Errorf("OPENAI_API_KEY not configured")
	}
	prompt := fmt.Sprintf(`Rewrite this resume mapping to emphasize "%s" for a "%s" role. Reorder skills and bullets to highlight relevant experience. Rewrite the summary to match the focus. Keep factual accuracy — do not invent employers or degrees. Return the same JSON schema.

Focus: %s
Target role: %s
Mapping:
%s`, focus, targetRole, focus, targetRole, string(mapping))
	return c.completeJSON(ctx, prompt, "resume_rewrite", resumeMappingSchema)
}

func (c *Client) completeJSON(ctx context.Context, userPrompt, schemaName string, schema map[string]any) (json.RawMessage, error) {
	body, err := json.Marshal(chatRequest{
		Model: c.model,
		Messages: []chatMessage{
			{Role: "system", Content: "You are a professional resume parser and career coach. Output valid JSON only."},
			{Role: "user", Content: userPrompt},
		},
		ResponseFormat: &responseFormat{
			Type: "json_schema",
			JSONSchema: map[string]any{
				"name":   schemaName,
				"strict": true,
				"schema": schema,
			},
		},
		Temperature: 0.2,
	})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, openAIURL, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	res, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	raw, err := io.ReadAll(io.LimitReader(res.Body, 2<<20))
	if err != nil {
		return nil, err
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, fmt.Errorf("openai error %d: %s", res.StatusCode, string(raw))
	}

	var out chatResponse
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	if out.Error != nil && out.Error.Message != "" {
		return nil, fmt.Errorf("openai: %s", out.Error.Message)
	}
	if len(out.Choices) == 0 || out.Choices[0].Message.Content == "" {
		return nil, fmt.Errorf("openai: empty response")
	}

	content := strings.TrimSpace(out.Choices[0].Message.Content)
	if !json.Valid([]byte(content)) {
		return nil, fmt.Errorf("openai: invalid json in response")
	}
	return json.RawMessage(content), nil
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max]
}
