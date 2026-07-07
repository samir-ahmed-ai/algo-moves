package resume

import (
	"archive/zip"
	"bytes"
	"testing"
)

func TestExtractResumeText_txt(t *testing.T) {
	data := []byte("Hello resume world")
	got, err := ExtractResumeText("resume.txt", "text/plain", data)
	if err != nil {
		t.Fatal(err)
	}
	if got != "Hello resume world" {
		t.Fatalf("got %q", got)
	}
}

func TestExtractResumeText_docx(t *testing.T) {
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	w, err := zw.Create("word/document.xml")
	if err != nil {
		t.Fatal(err)
	}
	_, err = w.Write([]byte(`<w:document><w:body><w:p><w:r><w:t>Jane Doe</w:t></w:r></w:p></w:body></w:document>`))
	if err != nil {
		t.Fatal(err)
	}
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}

	got, err := ExtractResumeText("resume.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buf.Bytes())
	if err != nil {
		t.Fatal(err)
	}
	if got != "Jane Doe" {
		t.Fatalf("got %q", got)
	}
}

func TestExtractResumeText_unsupported(t *testing.T) {
	_, err := ExtractResumeText("resume.xyz", "application/octet-stream", []byte("data"))
	if err == nil {
		t.Fatal("expected error for unsupported type")
	}
}

func TestExtractResumeText_empty(t *testing.T) {
	_, err := ExtractResumeText("resume.txt", "text/plain", nil)
	if err == nil {
		t.Fatal("expected error for empty file")
	}
}
