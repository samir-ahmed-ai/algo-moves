package app

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"algomoves/gameserver/internal/config"
	"time"

	"algomoves/gameserver/internal/resume"
)

const testResumeMapping = `{
  "contact": {"name":"Alice","email":"alice@example.com","phone":"","location":"","links":[]},
  "summary": "Software engineer",
  "skills": [
    {"name":"Java","category":"","tags":["java"],"weight":1},
    {"name":"Python","category":"","tags":["python"],"weight":1}
  ],
  "experience": [{
    "company":"Acme",
    "role":"SWE",
    "start":"2020",
    "end":"2024",
    "bullets": [
      {"text":"Built Java services","tags":["java"]},
      {"text":"Led Python ML pipeline","tags":["python"]}
    ]
  }],
  "projects": [],
  "education": [],
  "certifications": []
}`

func setTestSecretsKey(t *testing.T) {
	t.Helper()
	key := make([]byte, 32)
	for i := range key {
		key[i] = byte(i + 42)
	}
	t.Setenv("SECRETS_ENCRYPTION_KEY", base64.StdEncoding.EncodeToString(key))
}

// Integration test for profile OpenAI key storage — skipped unless DATABASE_URL is set.
func TestProfileIntegrationsFlow(t *testing.T) {
	url := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if url == "" {
		t.Skip("DATABASE_URL not set")
	}
	t.Setenv("DATABASE_URL", url)
	t.Setenv("RUN_MIGRATIONS", "true")
	setTestSecretsKey(t)

	ctx := context.Background()
	svc, err := Open(ctx, config.Load())
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer svc.Close()

	mux := http.NewServeMux()
	svc.Register(mux)
	ts := httptest.NewServer(mux)
	defer ts.Close()

	owner, _ := newSignedInClient(t, ts.URL, fmt.Sprintf("integrations-%d@example.com", time.Now().UnixNano()), "Integrations Tester")
	guest := newGuestClient(t, ts.URL)

	guestGet := doJSON(t, ts.URL, http.MethodGet, "/api/profiles/me/integrations", guest, "")
	if guestGet.status != http.StatusUnauthorized {
		t.Fatalf("guest integrations status: %d (want 401)", guestGet.status)
	}

	put := doJSON(t, ts.URL, http.MethodPut, "/api/profiles/me/integrations", owner,
		`{"openaiApiKey":"sk-test-integration-key-abcdef"}`)
	if put.status != http.StatusOK {
		t.Fatalf("put key status: %d body %v", put.status, put.body)
	}
	openai, _ := put.body["openai"].(map[string]any)
	if openai["configured"] != true {
		t.Fatalf("put: expected configured true, got %v", openai)
	}
	if openai["hint"] != "cdef" {
		t.Fatalf("put: hint = %v", openai["hint"])
	}

	get := doJSON(t, ts.URL, http.MethodGet, "/api/profiles/me/integrations", owner, "")
	if get.status != http.StatusOK {
		t.Fatalf("get status: %d", get.status)
	}
	openaiGet, _ := get.body["openai"].(map[string]any)
	if openaiGet["configured"] != true {
		t.Fatalf("get: configured = %v", openaiGet["configured"])
	}

	clear := doJSON(t, ts.URL, http.MethodPut, "/api/profiles/me/integrations", owner, `{"openaiApiKey":""}`)
	if clear.status != http.StatusOK {
		t.Fatalf("clear status: %d", clear.status)
	}
	openaiClear, _ := clear.body["openai"].(map[string]any)
	if openaiClear["configured"] != false {
		t.Fatalf("clear: configured = %v", openaiClear["configured"])
	}
}

// Integration test for resume CRUD, customize, and variants — skipped unless DATABASE_URL is set.
func TestArcadeResumeFlow(t *testing.T) {
	url := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if url == "" {
		t.Skip("DATABASE_URL not set")
	}
	t.Setenv("DATABASE_URL", url)
	t.Setenv("RUN_MIGRATIONS", "true")
	setTestSecretsKey(t)

	ctx := context.Background()
	svc, err := Open(ctx, config.Load())
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	if svc == nil || !svc.Enabled() {
		t.Fatal("expected enabled arcade service")
	}
	defer svc.Close()

	mux := http.NewServeMux()
	svc.Register(mux)
	ts := httptest.NewServer(mux)
	defer ts.Close()

	email := fmt.Sprintf("resume-test-%d@example.com", time.Now().UnixNano())
	owner, ownerID := newSignedInClient(t, ts.URL, email, "Resume Tester")
	other, _ := newSignedInClient(t, ts.URL, fmt.Sprintf("resume-other-%d@example.com", time.Now().UnixNano()), "Other User")
	guest := newGuestClient(t, ts.URL)

	// Guests cannot upload.
	uploadGuest := doMultipartResume(t, ts.URL, guest, "resume.txt", "text/plain", []byte("hello"))
	if uploadGuest.status != http.StatusUnauthorized {
		t.Fatalf("guest upload status: %d (want 401)", uploadGuest.status)
	}

	// Seed a resume directly (avoids OpenAI in tests).
	mapping := json.RawMessage(testResumeMapping)
	created, err := resume.NewRepository(svc.Database()).CreateResume(ctx, ownerID, "Test Resume", "resume.txt", "text/plain",
		[]byte("hello"), "hello", mapping, true)
	if err != nil {
		t.Fatalf("seed resume: %v", err)
	}
	id := created.ID
	if id == "" {
		t.Fatal("seed: missing id")
	}

	// List (owner).
	list := doJSONList(t, ts.URL, http.MethodGet, "/api/resumes", owner, "")
	if list.status != http.StatusOK {
		t.Fatalf("list status: %d", list.status)
	}
	found := false
	for _, row := range list.body {
		if row["id"] == id {
			found = true
			if row["title"] != "Test Resume" {
				t.Fatalf("list: title = %v", row["title"])
			}
		}
	}
	if !found {
		t.Fatal("list: seeded resume not returned")
	}

	// Get (owner) — rawText present.
	get := doJSON(t, ts.URL, http.MethodGet, "/api/resumes/"+id, owner, "")
	if get.status != http.StatusOK {
		t.Fatalf("get status: %d", get.status)
	}
	if get.body["rawText"] == nil || get.body["rawText"] == "" {
		t.Fatal("get: owner should see rawText")
	}

	// Get (other signed-in user) — public resume, rawText stripped.
	getOther := doJSON(t, ts.URL, http.MethodGet, "/api/resumes/"+id, other, "")
	if getOther.status != http.StatusOK {
		t.Fatalf("get other status: %d", getOther.status)
	}
	if _, leaked := getOther.body["rawText"]; leaked && getOther.body["rawText"] != "" {
		t.Fatal("get other: rawText should be stripped for non-owner")
	}

	// Update title.
	upd := doJSON(t, ts.URL, http.MethodPut, "/api/resumes/"+id, owner,
		`{"title":"Renamed Resume"}`)
	if upd.status != http.StatusOK {
		t.Fatalf("update status: %d", upd.status)
	}
	if upd.body["title"] != "Renamed Resume" {
		t.Fatalf("update: title = %v", upd.body["title"])
	}

	// Customize (rules) + save variant.
	custom := doJSON(t, ts.URL, http.MethodPost, "/api/resumes/"+id+"/customize", owner,
		`{"focus":"python","targetRole":"Python Engineer","mode":"rules","save":true,"label":"Python focus"}`)
	if custom.status != http.StatusOK {
		t.Fatalf("customize status: %d", custom.status)
	}
	if custom.body["focus"] != "python" || custom.body["mode"] != "rules" {
		t.Fatalf("customize: unexpected body %v", custom.body)
	}
	variant, ok := custom.body["variant"].(map[string]any)
	if !ok || variant["id"] == nil || variant["id"] == "" {
		t.Fatalf("customize: missing variant %v", custom.body["variant"])
	}
	variantID, _ := variant["id"].(string)

	// List variants.
	variants := doJSONList(t, ts.URL, http.MethodGet, "/api/resumes/"+id+"/variants", owner, "")
	if variants.status != http.StatusOK || len(variants.body) != 1 {
		t.Fatalf("variants status: %d len: %d", variants.status, len(variants.body))
	}
	if variants.body[0]["label"] != "Python focus" {
		t.Fatalf("variants: label = %v", variants.body[0]["label"])
	}

	// Directory includes public resume (signed-in required).
	dirGuest := doJSONList(t, ts.URL, http.MethodGet, "/api/resumes/directory", guest, "")
	if dirGuest.status != http.StatusUnauthorized {
		t.Fatalf("directory guest status: %d (want 401)", dirGuest.status)
	}
	dir := doJSONList(t, ts.URL, http.MethodGet, "/api/resumes/directory", owner, "")
	if dir.status != http.StatusOK {
		t.Fatalf("directory status: %d", dir.status)
	}
	dirFound := false
	for _, row := range dir.body {
		if row["id"] == id {
			dirFound = true
			if row["ownerDisplayName"] == "" {
				t.Fatal("directory: missing ownerDisplayName")
			}
		}
	}
	if !dirFound {
		t.Fatal("directory: seeded resume not returned")
	}

	// Owner guard — other user cannot delete resume or variant.
	delResumeOther := doJSON(t, ts.URL, http.MethodDelete, "/api/resumes/"+id, other, "")
	if delResumeOther.status != http.StatusNotFound {
		t.Fatalf("delete resume by other: %d (want 404)", delResumeOther.status)
	}
	delVarOther := doJSON(t, ts.URL, http.MethodDelete, "/api/resumes/"+id+"/variants/"+variantID, other, "")
	if delVarOther.status != http.StatusNotFound {
		t.Fatalf("delete variant by other: %d (want 404)", delVarOther.status)
	}

	// Delete variant.
	delVar := doJSON(t, ts.URL, http.MethodDelete, "/api/resumes/"+id+"/variants/"+variantID, owner, "")
	if delVar.status != http.StatusOK || delVar.body["ok"] != true {
		t.Fatalf("delete variant: status %d body %v", delVar.status, delVar.body)
	}

	// Delete resume.
	del := doJSON(t, ts.URL, http.MethodDelete, "/api/resumes/"+id, owner, "")
	if del.status != http.StatusOK || del.body["ok"] != true {
		t.Fatalf("delete resume: status %d body %v", del.status, del.body)
	}
	gone := doJSON(t, ts.URL, http.MethodGet, "/api/resumes/"+id, owner, "")
	if gone.status != http.StatusNotFound {
		t.Fatalf("get after delete: %d (want 404)", gone.status)
	}
}

func newSignedInClient(t *testing.T, base, email, displayName string) (*http.Client, string) {
	t.Helper()
	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatalf("cookie jar: %v", err)
	}
	client := &http.Client{Jar: jar}
	payload := fmt.Sprintf(
		`{"email":%q,"password":"testpassword123","display_name":%q}`,
		email, displayName,
	)
	signup := doJSON(t, base, http.MethodPost, "/api/auth/signup", client, payload)
	if signup.status != http.StatusOK {
		t.Fatalf("signup status: %d body %v", signup.status, signup.body)
	}
	profileID, _ := signup.body["profile_id"].(string)
	if profileID == "" {
		t.Fatal("signup: missing profile_id")
	}
	profile, _ := signup.body["profile"].(map[string]any)
	if profile == nil || profile["is_anonymous"] != false {
		t.Fatalf("signup: expected non-anonymous profile %v", profile)
	}
	return client, profileID
}

type multipartResult struct {
	status int
	body   map[string]any
}

func doMultipartResume(t *testing.T, base string, client *http.Client, filename, contentType string, data []byte) multipartResult {
	t.Helper()
	var b strings.Builder
	boundary := "resumeTestBoundary"
	b.WriteString("--" + boundary + "\r\n")
	b.WriteString(`Content-Disposition: form-data; name="file"; filename="` + filename + `"` + "\r\n")
	b.WriteString("Content-Type: " + contentType + "\r\n\r\n")
	b.Write(data)
	b.WriteString("\r\n--" + boundary + "--\r\n")

	req, err := http.NewRequest(http.MethodPost, base+"/api/resumes", strings.NewReader(b.String()))
	if err != nil {
		t.Fatalf("multipart request: %v", err)
	}
	req.Header.Set("Content-Type", "multipart/form-data; boundary="+boundary)
	res, err := client.Do(req)
	if err != nil {
		t.Fatalf("multipart do: %v", err)
	}
	defer res.Body.Close()
	out := multipartResult{status: res.StatusCode}
	_ = json.NewDecoder(res.Body).Decode(&out.body)
	return out
}
