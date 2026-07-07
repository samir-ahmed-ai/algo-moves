package resume

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"strings"

	"github.com/ledongthuc/pdf"
)

const maxResumeFileBytes = 5 << 20 // 5 MiB

// ExtractResumeText reads plain text from a PDF or DOCX upload.
func ExtractResumeText(filename, contentType string, data []byte) (string, error) {
	if len(data) == 0 {
		return "", fmt.Errorf("empty file")
	}
	if len(data) > maxResumeFileBytes {
		return "", fmt.Errorf("file too large (max 5MB)")
	}

	lower := strings.ToLower(filename)
	switch {
	case strings.HasSuffix(lower, ".pdf") || strings.Contains(contentType, "pdf"):
		return extractPDFText(data)
	case strings.HasSuffix(lower, ".docx") || strings.Contains(contentType, "wordprocessingml"):
		return extractDOCXText(data)
	case strings.HasSuffix(lower, ".txt") || strings.HasPrefix(contentType, "text/"):
		return string(data), nil
	default:
		return "", fmt.Errorf("unsupported file type (use PDF, DOCX, or TXT)")
	}
}

func extractPDFText(data []byte) (string, error) {
	r, err := pdf.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "", fmt.Errorf("pdf read: %w", err)
	}
	var b strings.Builder
	n := r.NumPage()
	for i := 1; i <= n; i++ {
		page := r.Page(i)
		if page.V.IsNull() {
			continue
		}
		text, err := page.GetPlainText(nil)
		if err != nil {
			continue
		}
		b.WriteString(text)
		b.WriteByte('\n')
	}
	out := strings.TrimSpace(b.String())
	if out == "" {
		return "", fmt.Errorf("no text extracted from pdf")
	}
	return out, nil
}

func extractDOCXText(data []byte) (string, error) {
	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "", fmt.Errorf("docx zip: %w", err)
	}
	var docXML []byte
	for _, f := range zr.File {
		if f.Name == "word/document.xml" {
			rc, err := f.Open()
			if err != nil {
				return "", err
			}
			docXML, err = io.ReadAll(io.LimitReader(rc, 2<<20))
			rc.Close()
			if err != nil {
				return "", err
			}
			break
		}
	}
	if len(docXML) == 0 {
		return "", fmt.Errorf("docx missing document.xml")
	}
	return strings.TrimSpace(stripXMLText(string(docXML))), nil
}

func stripXMLText(s string) string {
	var b strings.Builder
	inTag := false
	for _, r := range s {
		switch {
		case r == '<':
			inTag = true
		case r == '>':
			inTag = false
		case !inTag:
			b.WriteRune(r)
		}
	}
	return strings.Join(strings.Fields(b.String()), " ")
}
