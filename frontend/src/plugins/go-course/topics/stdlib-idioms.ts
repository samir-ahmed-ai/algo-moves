import type { GoTopic } from '../types';

// AUTO-GENERATED go-course topic — authored & Go-1.26-verified content.
export const stdlibIdioms: GoTopic = {
  "id": "stdlib-idioms",
  "title": "Standard Library & Idioms",
  "icon": "Library",
  "concepts": [
    {
      "id": "go-std-io",
      "title": "io.Reader / io.Writer composition",
      "difficulty": "Hard",
      "tags": [
        "io",
        "interfaces",
        "streaming",
        "bufio",
        "composition"
      ],
      "summary": "Compose small io interfaces to stream data through wrappers without buffering everything in memory.",
      "pattern": "Streaming IO",
      "visual": "Read fills a caller-owned slice, returns (n, err); wrappers chain Read/Write calls without copying the whole stream.",
      "memorize": "Read may return n>0 AND err; process bytes before checking err. io.EOF is a value, not a failure.",
      "scene": "Water flowing through a series of pipe fittings: each fitting (Tee, MultiWriter, counter) taps or splits the stream, but no bucket holds it all.",
      "time": "O(n) in bytes streamed",
      "space": "O(buffer) not O(stream)",
      "keyPoints": [
        "The io.Reader contract allows n>0 with a non-nil error (including io.EOF); always process returned bytes before inspecting the error.",
        "io.Copy treats io.EOF as success and returns nil; a non-nil result means a real read/write failure or short write.",
        "bufio.Writer buffers in memory and only emits on fill or Flush/Close — forgetting Flush silently drops the tail.",
        "io.TeeReader and io.MultiWriter enable fan-out (hash-while-streaming, mirror-to-two-sinks) without holding the whole stream; MultiWriter stops at the first sink error.",
        "bufio.Scanner caps tokens at bufio.MaxScanTokenSize (64 KB) by default and reports bufio.ErrTooLong; raise it via Buffer() for large lines.",
        "io.LimitReader returns EOF once N bytes are consumed without touching the underlying reader; good for bounding untrusted input, but that EOF is indistinguishable from a genuine end."
      ],
      "code": "package main\n\nimport (\n\t\"bufio\"\n\t\"bytes\"\n\t\"crypto/sha256\"\n\t\"fmt\"\n\t\"io\"\n\t\"strings\"\n)\n\n// countingReader wraps an io.Reader and tracks how many bytes flowed through it.\ntype countingReader struct {\n\tr io.Reader\n\tn int64\n}\n\nfunc (c *countingReader) Read(p []byte) (int, error) {\n\tn, err := c.r.Read(p)\n\tc.n += int64(n)\n\treturn n, err\n}\n\nfunc main() {\n\tsrc := strings.NewReader(\"the quick brown fox\\njumps over the lazy dog\\n\")\n\n\t// Count bytes as they are read.\n\tcr := &countingReader{r: src}\n\n\t// Tee everything read into a hash so we digest while we stream.\n\th := sha256.New()\n\ttee := io.TeeReader(cr, h)\n\n\t// Fan out the output to two sinks at once.\n\tvar buf bytes.Buffer\n\tmirror := &bytes.Buffer{}\n\tdst := io.MultiWriter(&buf, mirror)\n\n\tif _, err := io.Copy(dst, tee); err != nil {\n\t\tpanic(err)\n\t}\n\n\t// Line-oriented reads over the captured bytes.\n\tsc := bufio.NewScanner(&buf)\n\tlines := 0\n\tfor sc.Scan() {\n\t\tlines++\n\t}\n\tif err := sc.Err(); err != nil {\n\t\tpanic(err)\n\t}\n\n\tfmt.Printf(\"bytes=%d lines=%d sum=%x\\n\", cr.n, lines, h.Sum(nil)[:4])\n}\n",
      "quiz": [
        {
          "id": "read-n-and-err",
          "prompt": "A correct io.Reader implementation calls into an underlying source. Which behavior must a caller of Read be prepared to handle per the io.Reader contract?",
          "choices": [
            {
              "label": "n>0 with err!=nil — process bytes before checking err",
              "correct": true
            },
            {
              "label": "err implies n==0 — a nonzero read never errors"
            },
            {
              "label": "n==0, err==nil forbidden — must never happen"
            },
            {
              "label": "io.EOF always alone — never returned with data"
            }
          ],
          "explain": "The io.Reader contract explicitly permits returning n>0 bytes AND a non-nil err (including io.EOF) in the same call; callers must consume the n bytes first, then handle err. (0, nil) is discouraged but not forbidden, so 'must never happen' is wrong."
        },
        {
          "id": "copy-eof",
          "prompt": "io.Copy(dst, src) returns after the source is exhausted. What does its returned error value reflect on a normal successful completion?",
          "choices": [
            {
              "label": "nil — io.Copy swallows io.EOF as success",
              "correct": true
            },
            {
              "label": "io.EOF — propagated from the final Read"
            },
            {
              "label": "io.ErrUnexpectedEOF — signals stream end"
            },
            {
              "label": "io.ErrShortWrite — always on completion"
            }
          ],
          "explain": "io.Copy treats io.EOF as the normal termination signal and returns nil on success; it only returns a non-nil error for real read/write failures or a short write."
        },
        {
          "id": "bufio-flush",
          "prompt": "You wrap a net.Conn with bufio.NewWriter and issue several Write calls followed by returning from the handler. Why might the peer never receive the final bytes?",
          "choices": [
            {
              "label": "Flush not called — buffered bytes never reach the conn",
              "correct": true
            },
            {
              "label": "flushes on each Write — so data is lost elsewhere"
            },
            {
              "label": "flushes on GC finalizer — timing race"
            },
            {
              "label": "Write returns short — silently drops the tail"
            }
          ],
          "explain": "bufio.Writer accumulates data in memory and only pushes to the underlying writer when the buffer fills or Flush/Close is called; forgetting Flush leaves the tail buffered and never sent."
        },
        {
          "id": "scanner-token-limit",
          "prompt": "bufio.Scanner reads a stream where one 'line' is 128 KB with no newline. With default settings, what happens?",
          "choices": [
            {
              "label": "Scan returns false — Err is bufio.ErrTooLong",
              "correct": true
            },
            {
              "label": "Scanner grows unbounded — reads the full line"
            },
            {
              "label": "Scan silently truncates — keeps first 64 KB"
            },
            {
              "label": "Scan panics — token exceeds the buffer"
            }
          ],
          "explain": "bufio.Scanner has a default max token size of bufio.MaxScanTokenSize (64 KB); a longer token makes Scan stop and return false, with Err reporting bufio.ErrTooLong unless you raise the limit via Buffer()."
        },
        {
          "id": "multiwriter-error",
          "prompt": "io.MultiWriter(a, b, c) is used as an io.Copy destination. Writer b returns an error mid-stream. What happens?",
          "choices": [
            {
              "label": "Write stops at b — returns b's error immediately",
              "correct": true
            },
            {
              "label": "all writers still called — errors aggregated at end"
            },
            {
              "label": "b is skipped — a and c keep receiving data"
            },
            {
              "label": "c also gets bytes — MultiWriter retries b"
            }
          ],
          "explain": "MultiWriter writes to each writer in order and returns on the first error without calling the remaining writers, so c is not written for that call and Copy aborts."
        },
        {
          "id": "limitreader-eof",
          "prompt": "You wrap a body with io.LimitReader(r, 1024) to cap reads. The underlying r actually holds 5000 bytes. After reading 1024 bytes, what does the next Read return?",
          "choices": [
            {
              "label": "(0, io.EOF) — limit reached, underlying untouched",
              "correct": true
            },
            {
              "label": "(0, nil) — signals more data may come"
            },
            {
              "label": "remaining 3976 bytes — limit is advisory"
            },
            {
              "label": "io.ErrUnexpectedEOF — truncation detected"
            }
          ],
          "explain": "io.LimitReader returns io.EOF once N bytes have been read regardless of what remains underneath; when its internal limit hits zero it returns EOF without calling the underlying reader, and it does not close or drain it."
        }
      ],
      "design": {
        "prompt": "You are designing a streaming upload pipeline: bytes arrive over HTTP, must be (1) size-limited to prevent abuse, (2) checksummed with SHA-256, (3) gzip-compressed, and (4) written to object storage — all without buffering the whole payload in memory. How do you compose io.Reader/io.Writer, where do you put each concern, and what are the failure and resource pitfalls?",
        "answer": "Compose small interfaces as a chain rather than staging the payload. Wrap the request body first in io.LimitReader (or http.MaxBytesReader, which also signals the client) to bound memory and reject oversize uploads early. For the checksum, use io.TeeReader(limited, sha256Hasher) so bytes are digested as they flow, or alternatively io.MultiWriter on the write side; pick the side that keeps the hash aligned with exactly the bytes you persist. Compression belongs on the write path: pipe into a gzip.Writer that wraps the storage writer, and drive it with io.Copy(gzipWriter, teeReader). The key recommendation is to run the whole thing through a single io.Copy so backpressure is preserved and only a small buffer (typically 32 KB) is resident. Pitfalls: you must Close the gzip.Writer (not just the storage writer) to flush its trailer, and do it before checking the final error; io.Copy returns nil on EOF so do not treat EOF as failure; a MultiWriter aborts on the first sink error, so a slow or failing storage writer stops hashing too; and LimitReader returning EOF at the cap looks identical to a genuine short body, so validate the byte count explicitly. Order matters: hash the plaintext before gzip if you want to verify content identity, or the compressed bytes if you want to verify what landed in storage, and state which invariant you need. Use bufio only where syscall counts matter (many tiny writes to the network or disk), remembering to Flush it in the correct order relative to gzip.Close."
      },
      "walkthrough": [
        {
          "title": "Build the reader chain",
          "caption": "A string source is wrapped by countingReader so every byte read from src also increments a counter, forming the base of a lazy pipeline that moves nothing yet.",
          "focus": [
            "src := strings.NewReader(\"the quick brown fox\\njumps over the lazy dog\\n\")",
            "cr := &countingReader{r: src}"
          ],
          "state": [
            {
              "k": "cr.n",
              "v": "0"
            },
            {
              "k": "src bytes",
              "v": "44 unread"
            },
            {
              "k": "data moved",
              "v": "none (lazy)"
            }
          ]
        },
        {
          "title": "Tee reads into a hash",
          "caption": "TeeReader wraps cr so that whatever is Read from tee is simultaneously written into the sha256 hash, letting us digest the stream while it flows rather than after.",
          "focus": [
            "h := sha256.New()",
            "tee := io.TeeReader(cr, h)"
          ],
          "state": [
            {
              "k": "hash",
              "v": "empty"
            },
            {
              "k": "reader chain",
              "v": "src->cr->tee"
            },
            {
              "k": "cr.n",
              "v": "0"
            }
          ]
        },
        {
          "title": "Fan out the writer side",
          "caption": "MultiWriter bundles buf and mirror into one dst so a single Write call duplicates the bytes into both buffers at once.",
          "focus": [
            "dst := io.MultiWriter(&buf, mirror)"
          ],
          "state": [
            {
              "k": "buf.Len",
              "v": "0"
            },
            {
              "k": "mirror.Len",
              "v": "0"
            },
            {
              "k": "sinks",
              "v": "2"
            }
          ]
        },
        {
          "title": "Copy pumps the pipeline",
          "caption": "io.Copy loops calling tee.Read into an internal 32KB buffer and writing to dst, so bytes stream src->cr(count)->tee(hash)->dst(buf+mirror) without ever buffering the whole input separately.",
          "focus": [
            "if _, err := io.Copy(dst, tee); err != nil {"
          ],
          "state": [
            {
              "k": "cr.n",
              "v": "44"
            },
            {
              "k": "hash",
              "v": "digesting"
            },
            {
              "k": "buf.Len",
              "v": "44"
            },
            {
              "k": "mirror.Len",
              "v": "44"
            }
          ]
        },
        {
          "title": "How EOF terminates",
          "caption": "strings.Reader returns the final bytes with a nil error, then returns n=0 with io.EOF on the next call; countingReader adds each n to the count and passes the error through unchanged, and io.Copy treats that io.EOF as a clean stop (not an error).",
          "focus": [
            "n, err := c.r.Read(p)",
            "c.n += int64(n)",
            "return n, err"
          ],
          "state": [
            {
              "k": "final data Read",
              "v": "n>0, err=nil"
            },
            {
              "k": "next Read",
              "v": "n=0, err=EOF"
            },
            {
              "k": "cr.n",
              "v": "44 (final)"
            }
          ]
        },
        {
          "title": "Scan the captured bytes",
          "caption": "bufio.Scanner reads buf line by line, splitting on '\\n', incrementing lines for each of the two lines it yields.",
          "focus": [
            "sc := bufio.NewScanner(&buf)",
            "for sc.Scan() {"
          ],
          "state": [
            {
              "k": "lines",
              "v": "2"
            },
            {
              "k": "buf drained",
              "v": "yes"
            },
            {
              "k": "sc.Err",
              "v": "nil"
            }
          ]
        },
        {
          "title": "Report the results",
          "caption": "With the pipeline fully drained, it prints the counted byte total, the line count, and the first 4 bytes of the streamed sha256 digest.",
          "focus": [
            "fmt.Printf(\"bytes=%d lines=%d sum=%x\\n\", cr.n, lines, h.Sum(nil)[:4])"
          ],
          "state": [
            {
              "k": "bytes",
              "v": "44"
            },
            {
              "k": "lines",
              "v": "2"
            },
            {
              "k": "sum",
              "v": "sha256[:4]"
            }
          ]
        }
      ]
    },
    {
      "id": "go-std-json",
      "title": "encoding/json quirks",
      "difficulty": "Hard",
      "tags": [
        "encoding/json",
        "serialization",
        "reflection",
        "struct-tags",
        "interfaces"
      ],
      "summary": "Reflection-driven (un)marshaling: exported fields, tags, omitempty, embedding, and interface{} defaults.",
      "pattern": "encoding/json",
      "visual": "reflect walks exported fields; tags rename; interface{} decodes to map[string]any + float64",
      "memorize": "Only exported fields; interface{} -> map[string]any & float64; omitempty tests the ZERO value; RawMessage defers parsing",
      "scene": "A customs officer (reflect) only lets CAPITALIZED passengers through the gate; every number arriving without a passport is stamped 'float64'.",
      "time": "O(n) over input bytes",
      "space": "O(n) for decoded tree",
      "code": "package main\n\nimport (\n\t\"encoding/json\"\n\t\"fmt\"\n)\n\ntype Base struct {\n\tID   int    `json:\"id\"`\n\tName string `json:\"name,omitempty\"`\n}\n\ntype Event struct {\n\tBase\n\tKind string          `json:\"kind\"`\n\tData json.RawMessage `json:\"data\"`\n\ttag  string\n}\n\nfunc main() {\n\te := Event{Base: Base{ID: 7}, Kind: \"click\", tag: \"ignored\"}\n\tout, _ := json.Marshal(e)\n\tfmt.Println(string(out))\n\n\tvar v interface{}\n\t_ = json.Unmarshal([]byte(`{\"n\":42,\"xs\":[1,2]}`), &v)\n\tm := v.(map[string]interface{})\n\tfmt.Printf(\"%T %T\\n\", m[\"n\"], m[\"xs\"])\n\n\tvar dec Event\n\t_ = json.Unmarshal([]byte(`{\"id\":9,\"kind\":\"k\",\"data\":{\"raw\":true}}`), &dec)\n\tfmt.Println(dec.ID, dec.Kind, string(dec.Data))\n}\n",
      "quiz": [
        {
          "id": "iface-number-type",
          "prompt": "Unmarshaling `{\"n\": 42}` into a variable of type `interface{}` yields a map whose `\"n\"` value has what dynamic type?",
          "choices": [
            {
              "label": "float64 — every JSON number decodes to float64",
              "correct": true
            },
            {
              "label": "int — integer literals stay integers",
              "correct": false
            },
            {
              "label": "json.Number — default numeric wrapper",
              "correct": false
            },
            {
              "label": "int64 — widest integer chosen automatically",
              "correct": false
            }
          ],
          "explain": "With no concrete target type, JSON numbers always decode into float64; json.Number requires opting in via Decoder.UseNumber()."
        },
        {
          "id": "unexported-skip",
          "prompt": "A struct has a field `tag string` (lowercase). What does `json.Marshal` do with it?",
          "choices": [
            {
              "label": "Field omitted — unexported stays invisible to reflect",
              "correct": true
            },
            {
              "label": "Emits \"tag\" — lowercase becomes the JSON key",
              "correct": false
            },
            {
              "label": "Panics — unexported fields are unsupported",
              "correct": false
            },
            {
              "label": "Emits null — value treated as absent",
              "correct": false
            }
          ],
          "explain": "encoding/json uses reflection, which cannot read unexported fields, so they are silently skipped in both directions regardless of any tag."
        },
        {
          "id": "omitempty-zero",
          "prompt": "For a field `Count int `json:\"count,omitempty\"``, when is `count` omitted from Marshal output?",
          "choices": [
            {
              "label": "When Count is 0 — omitempty tests the zero value",
              "correct": true
            },
            {
              "label": "Never for ints — omitempty ignores numeric fields",
              "correct": false
            },
            {
              "label": "When Count is negative — negatives count as empty",
              "correct": false
            },
            {
              "label": "Only for pointers — value ints always serialize",
              "correct": false
            }
          ],
          "explain": "omitempty drops a field when it equals its type's zero value; for int that is 0. It cannot distinguish an explicit 0 from an unset field."
        },
        {
          "id": "omitempty-struct",
          "prompt": "A field `Meta Info `json:\"meta,omitempty\"`` where Info is a struct type and the value is the zero struct. What appears in the output?",
          "choices": [
            {
              "label": "meta object — omitempty never fires for structs",
              "correct": true
            },
            {
              "label": "Nothing emitted — zero struct counts as empty",
              "correct": false
            },
            {
              "label": "meta null — zero struct marshals as null",
              "correct": false
            },
            {
              "label": "empty object — struct collapses under omitempty",
              "correct": false
            }
          ],
          "explain": "omitempty only recognizes false, 0, nil pointer/interface, and empty array/slice/map/string; a zero struct is never 'empty', so the object is always emitted. To skip zero structs in Go 1.24+ use the omitzero tag option instead."
        },
        {
          "id": "embed-promotion",
          "prompt": "An embedded struct `Base` (no json tag) with tagged fields is marshaled inside an outer struct. How do Base's fields appear?",
          "choices": [
            {
              "label": "Flattened — promoted to the outer object level",
              "correct": true
            },
            {
              "label": "Nested object — under a \"Base\" sub-object",
              "correct": false
            },
            {
              "label": "Nested object — under a \"base\" lowercase key",
              "correct": false
            },
            {
              "label": "Dropped — anonymous fields are skipped",
              "correct": false
            }
          ],
          "explain": "An anonymous (embedded) struct field without a json tag has its exported fields promoted and flattened into the parent object, as if declared inline. Adding a tag turns it into a nested object."
        },
        {
          "id": "rawmessage-defer",
          "prompt": "What is the primary purpose of a `json.RawMessage` field during Unmarshal?",
          "choices": [
            {
              "label": "Defers parsing — stores raw bytes for later decode",
              "correct": true
            },
            {
              "label": "Validates JSON — rejects malformed nested values",
              "correct": false
            },
            {
              "label": "Speeds numbers — parses ints without float64",
              "correct": false
            },
            {
              "label": "Compresses input — stores a gzipped payload",
              "correct": false
            }
          ],
          "explain": "json.RawMessage captures the verbatim bytes of a sub-value without decoding it, enabling deferred/conditional parsing (for example, dispatching on a discriminator field first)."
        }
      ],
      "design": {
        "prompt": "You are designing a webhook ingestion service that receives events with a shared `type` discriminator field and a polymorphic `payload` whose shape depends on `type`. Some payloads must round-trip byte-for-byte to downstream systems. How do you model decoding with encoding/json, and what are the tradeoffs?",
        "answer": "The idiomatic approach is a two-phase decode: define an envelope struct with `Type string` and `Payload json.RawMessage`, unmarshal the outer object once, switch on Type, then unmarshal Payload into the concrete type. RawMessage defers parsing and preserves the original bytes exactly, which satisfies the byte-for-byte round-trip requirement (unlike decoding to a struct and re-marshaling, which normalizes key order, whitespace, and number formatting). Avoid decoding to `interface{}` for known-typed payloads: it forces map[string]interface{}/float64, loses integer precision, and pushes type assertions everywhere. Key pitfalls: json.RawMessage is `[]byte`, so retain a copy if the source buffer is reused (a streaming Decoder may alias); omitempty cannot distinguish an absent field from a zero value, so use pointers or json.RawMessage when 'field was present' matters (or omitzero in Go 1.24+ to skip zero structs); and unknown fields are silently ignored unless you call Decoder.DisallowUnknownFields() for strict validation. Recommendation: envelope + RawMessage + a registry mapping type strings to constructor/decoder functions, with DisallowUnknownFields on the envelope for safety and RawMessage passthrough for opaque forwarding. This keeps the hot path allocation-light and makes adding new event types a registration change rather than a decoder rewrite."
      },
      "keyPoints": [
        "Only exported fields are (un)marshaled; unexported fields are invisible to reflection and silently skipped.",
        "Decoding into interface{} produces map[string]interface{}, []interface{}, and float64 for all numbers; use Decoder.UseNumber() to preserve precision.",
        "omitempty tests the type's zero value (false/0/nil/empty coll/\"\") and never fires for structs or non-nil pointers; use omitzero (Go 1.24+) to skip zero structs.",
        "Anonymous embedded structs without a json tag are flattened; adding a tag makes them a nested object.",
        "json.RawMessage defers parsing and preserves exact bytes — ideal for discriminated unions and opaque passthrough.",
        "Unknown JSON keys are ignored by default; opt into strictness with Decoder.DisallowUnknownFields()."
      ],
      "walkthrough": [
        {
          "title": "Construct the Event",
          "caption": "An Event is built with an embedded Base (ID=7, Name unset), Kind=\"click\", and the unexported field tag set to \"ignored\".",
          "focus": [
            "e := Event{Base: Base{ID: 7}, Kind: \"click\", tag: \"ignored\"}"
          ],
          "state": [
            {
              "k": "e.ID",
              "v": "7"
            },
            {
              "k": "e.Name",
              "v": "\"\" (zero)"
            },
            {
              "k": "e.Kind",
              "v": "\"click\""
            },
            {
              "k": "e.tag",
              "v": "\"ignored\""
            }
          ]
        },
        {
          "title": "Marshal walks exported fields",
          "caption": "json.Marshal uses reflection: Base is embedded so its fields flatten to top level, Name has omitempty and is the zero \"\" so it is dropped, and unexported tag is skipped entirely.",
          "focus": [
            "out, _ := json.Marshal(e)"
          ],
          "state": [
            {
              "k": "id",
              "v": "7 (Base flattened)"
            },
            {
              "k": "name",
              "v": "omitted (zero + omitempty)"
            },
            {
              "k": "tag",
              "v": "skipped (unexported)"
            },
            {
              "k": "data",
              "v": "null (nil RawMessage)"
            }
          ]
        },
        {
          "title": "Print the JSON output",
          "caption": "The result is {\"id\":7,\"kind\":\"click\",\"data\":null}: embedded fields promoted, name omitted, tag absent, and nil RawMessage encoded as null.",
          "focus": [
            "fmt.Println(string(out))"
          ],
          "state": [
            {
              "k": "stdout",
              "v": "{\"id\":7,\"kind\":\"click\",\"data\":null}"
            }
          ]
        },
        {
          "title": "Unmarshal into interface{}",
          "caption": "With a nil interface{} target, json.Unmarshal chooses default Go types: JSON objects become map[string]interface{}, arrays become []interface{}, and all numbers become float64.",
          "focus": [
            "var v interface{}",
            "json.Unmarshal([]byte(`{\"n\":42,\"xs\":[1,2]}`), &v)"
          ],
          "state": [
            {
              "k": "v dynamic type",
              "v": "map[string]interface{}"
            },
            {
              "k": "m[\"n\"]",
              "v": "float64(42)"
            },
            {
              "k": "m[\"xs\"]",
              "v": "[]interface{}{float64(1),float64(2)}"
            }
          ]
        },
        {
          "title": "Type assertion + %T gotcha",
          "caption": "The assertion to map[string]interface{} succeeds, and %T reveals the number decoded as float64 (not int) and the array as []interface{}, the classic interface{} default.",
          "focus": [
            "m := v.(map[string]interface{})",
            "fmt.Printf(\"%T %T\\n\", m[\"n\"], m[\"xs\"])"
          ],
          "state": [
            {
              "k": "stdout",
              "v": "float64 []interface {}"
            }
          ]
        },
        {
          "title": "Unmarshal into typed struct",
          "caption": "Decoding into a concrete Event matches JSON keys to tags case-insensitively, fills the promoted embedded ID, and stores the data object verbatim without parsing because Data is json.RawMessage.",
          "focus": [
            "var dec Event",
            "json.Unmarshal([]byte(`{\"id\":9,\"kind\":\"k\",\"data\":{\"raw\":true}}`), &dec)"
          ],
          "state": [
            {
              "k": "dec.ID",
              "v": "9 (into embedded Base)"
            },
            {
              "k": "dec.Kind",
              "v": "\"k\""
            },
            {
              "k": "dec.Data",
              "v": "{\"raw\":true} (raw bytes, deferred)"
            }
          ]
        },
        {
          "title": "Print decoded fields",
          "caption": "Output is \"9 k {\\\"raw\\\":true}\": the RawMessage held the nested JSON as unparsed bytes, letting you defer or re-dispatch its parsing later.",
          "focus": [
            "fmt.Println(dec.ID, dec.Kind, string(dec.Data))"
          ],
          "state": [
            {
              "k": "stdout",
              "v": "9 k {\"raw\":true}"
            }
          ]
        }
      ]
    },
    {
      "id": "go-std-time",
      "title": "time: monotonic clocks & tickers",
      "difficulty": "Hard",
      "tags": [
        "time",
        "monotonic",
        "ticker",
        "timer",
        "concurrency"
      ],
      "summary": "How time.Time carries a monotonic reading, and how Timers and Tickers behave under Go 1.23+ unbuffered-channel semantics.",
      "pattern": "Time & Tickers",
      "visual": "time.Now() stamps wall+monotonic; Sub/Since use monotonic; Ticker.C is an unbuffered channel (cap 0) that Stop never closes.",
      "memorize": "Since uses monotonic; Go 1.23+ GCs unstopped timers and makes C unbuffered so Stop/Reset leave no stale value; Stop never closes C; Round(0) strips monotonic.",
      "scene": "A metronome (Ticker) in a back room: since Go 1.23 the runtime quietly carts it off for GC once nobody holds it, but Stop still never slams the channel door shut.",
      "time": "—",
      "space": "—",
      "code": "package main\n\nimport (\n\t\"context\"\n\t\"fmt\"\n\t\"time\"\n)\n\n// poll runs work every interval until ctx is cancelled.\nfunc poll(ctx context.Context, interval time.Duration, work func(time.Duration)) {\n\tstart := time.Now()\n\tticker := time.NewTicker(interval)\n\tdefer ticker.Stop() // stop future ticks promptly on return\n\n\tfor {\n\t\tselect {\n\t\tcase <-ctx.Done():\n\t\t\treturn\n\t\tcase <-ticker.C:\n\t\t\t// Since uses the monotonic reading captured in start,\n\t\t\t// so it is immune to wall-clock jumps (NTP, DST, manual sets).\n\t\t\twork(time.Since(start))\n\t\t}\n\t}\n}\n\nfunc main() {\n\tctx, cancel := context.WithTimeout(context.Background(), 120*time.Millisecond)\n\tdefer cancel()\n\n\tticks := 0\n\tpoll(ctx, 40*time.Millisecond, func(elapsed time.Duration) {\n\t\tticks++\n\t\tfmt.Printf(\"tick %d after ~%v\\n\", ticks, elapsed.Round(10*time.Millisecond))\n\t})\n\n\t// Round(0) strips the monotonic reading for stable marshaling/equality.\n\tt := time.Now().Round(0)\n\tfmt.Println(\"stripped monotonic:\", t.Equal(t))\n}\n",
      "quiz": [
        {
          "id": "since-ntp-step",
          "prompt": "You measure a duration with start := time.Now() then time.Since(start). Midway, an NTP daemon steps the wall clock backward by 5 seconds. What does time.Since(start) report?",
          "choices": [
            {
              "label": "Correct elapsed — Since reads the monotonic reading",
              "correct": true
            },
            {
              "label": "~5s too small — wall step subtracted out"
            },
            {
              "label": "Negative duration — clock went backward"
            },
            {
              "label": "Panic — monotonic and wall disagree"
            }
          ],
          "explain": "time.Now() records a monotonic reading alongside the wall clock, and Sub/Since use the monotonic delta when both operands carry it, so NTP steps, DST, and manual clock sets do not corrupt the measurement."
        },
        {
          "id": "time-after-loop-leak",
          "prompt": "Inside a hot for-loop compiled with a Go 1.23+ module, each iteration does `select { case <-work: ...; case <-time.After(d): ... }`. What is the senior-level concern under current Go?",
          "choices": [
            {
              "label": "Allocation churn — a fresh runtime timer every pass",
              "correct": true
            },
            {
              "label": "Timer leak — After lives until d fires, never GC'd"
            },
            {
              "label": "Nothing wrong — After needs no cleanup ever"
            },
            {
              "label": "Data race — After shares one global timer"
            }
          ],
          "explain": "Since Go 1.23 an unreferenced, unstopped timer is eligible for garbage collection immediately, so time.After no longer leaks until it fires; the remaining cost in a tight loop is the per-iteration allocation and runtime-timer scheduling overhead. Reusing one time.Timer with Reset, or a Ticker, avoids that churn."
        },
        {
          "id": "ticker-stop-drain",
          "prompt": "On a Go 1.23+ module you call ticker.Stop(), then immediately do a non-blocking `select { case <-ticker.C: ... default: }`. Which statement is true?",
          "choices": [
            {
              "label": "C is never closed — cannot range-until-closed on it",
              "correct": true
            },
            {
              "label": "Buffered tick survives — Stop leaves a stale value"
            },
            {
              "label": "Channel closed — receive yields the zero value"
            },
            {
              "label": "Panic — receiving on a stopped ticker"
            }
          ],
          "explain": "Stop halts future ticks but never closes C, so you cannot range over it waiting for a close. Since Go 1.23 the channel is unbuffered (cap 0) and Stop guarantees no value prepared before the call is delivered afterward, so the select falls to default rather than reading a stale tick."
        },
        {
          "id": "round-zero-strip",
          "prompt": "Two time.Time values come from time.Now(); one is round-tripped through JSON (RFC3339) and back. Comparing with == unexpectedly returns false even for the 'same' instant. Best fix?",
          "choices": [
            {
              "label": "Round(0) then Equal — strip monotonic, then compare",
              "correct": true
            },
            {
              "label": "Use < and > — == is unsupported on Time"
            },
            {
              "label": "Call UTC() on both — normalizes the monotonic part"
            },
            {
              "label": "Use time.Since — sidesteps the wall clock entirely"
            }
          ],
          "explain": "== compares struct fields including the monotonic reading, which marshaling drops, so a stamped value never equals its round-tripped copy; use t.Equal(u), which ignores monotonic, or strip it via Round(0). UTC() only changes the location and does not touch the monotonic reading."
        },
        {
          "id": "timer-vs-ticker",
          "prompt": "You need a callback to fire repeatedly at a fixed cadence. Which primitive and why?",
          "choices": [
            {
              "label": "time.Ticker — re-arms and coalesces missed ticks",
              "correct": true
            },
            {
              "label": "time.Timer — fires repeatedly until Stop"
            },
            {
              "label": "time.After goroutine — cheapest recurring source"
            },
            {
              "label": "time.Sleep loop — guarantees exact cadence"
            }
          ],
          "explain": "A Ticker delivers on a schedule and, when the receiver is slow, coalesces missed ticks rather than queueing them. A Timer fires exactly once, and Sleep-in-a-loop drifts because it adds the work's own runtime to every interval."
        },
        {
          "id": "timer-reset-race",
          "prompt": "On a Go 1.23+ module you reuse a single timer, calling t.Stop() then t.Reset(d). What is the correct expectation about the classic stale-value hazard?",
          "choices": [
            {
              "label": "No hazard now — Go 1.23 channels are unbuffered",
              "correct": true
            },
            {
              "label": "Reset panics — timer was already stopped"
            },
            {
              "label": "Reset ignored — Stop permanently disables it"
            },
            {
              "label": "Stop closes C — Reset must reopen the channel"
            }
          ],
          "explain": "Since Go 1.23 timer channels are unbuffered (cap 0) and Go guarantees no value prepared before a Stop or Reset is sent or received after it, so the pre-1.23 drain-guard dance is unnecessary. Reset re-arms a stopped timer without panicking, and Stop never closes C."
        }
      ],
      "design": {
        "prompt": "Design a resilient periodic scheduler that runs jobs every N seconds across a fleet of long-lived worker goroutines. Discuss how you'd handle slow jobs, clock changes, graceful shutdown, and avoiding goroutine/timer leaks under current (Go 1.23+) timer semantics.",
        "answer": "Use a single time.Ticker per worker rather than time.After-in-a-loop; even though Go 1.23+ garbage-collects unreferenced timers immediately, After-per-iteration still churns allocations and runtime-timer bookkeeping, so a reused Ticker is cheaper and clearer. Always defer ticker.Stop() to halt future ticks promptly and pair the ticker with a context or done channel in the same select so shutdown is prompt; note that Stop is no longer required merely to let the GC reclaim the ticker. For elapsed-time and deadline math rely on time.Since / time.Sub, which use the monotonic clock and are therefore immune to NTP steps, DST, and manual wall-clock changes; reserve wall time for human-facing timestamps and persist them with Round(0) or compare with Equal to avoid monotonic-reading surprises across marshaling. Handle slow jobs by deciding cadence semantics explicitly: a Ticker naturally coalesces missed ticks (fixed-rate, drop overruns), whereas re-arming only after the previous run finishes (Reset after completion) gives fixed-delay with no overlap; overlapping runs need a worker pool or a skip-if-busy guard. The main correctness pitfall is treating Ticker.C as closeable: it is never closed, so never range over it and always select on Done alongside it. On Go 1.23+ the channel is unbuffered (cap 0) and Stop/Reset guarantee no stale tick survives, so the old drain-before-Reset dance is obsolete; just avoid len/cap polling, which now returns 0. Recommendation: one Ticker + context per worker with defer Stop(), monotonic-based timing, and fixed-delay Reset semantics when jobs can outlast the interval."
      },
      "keyPoints": [
        "time.Now() captures wall + monotonic; Sub/Since/Add use the monotonic reading, making elapsed-time immune to NTP/DST/manual clock jumps.",
        "== on time.Time compares the monotonic field too; use Equal or strip via Round(0) for values that cross marshaling boundaries.",
        "Since Go 1.23 an unreferenced, unstopped Timer or Ticker is GC-eligible immediately; time.After in a loop no longer leaks until it fires, but it still churns allocations, so reuse a Timer/Ticker.",
        "Ticker.Stop halts future ticks but never closes C, so you cannot range-until-closed on it; still defer Stop to stop ticks promptly.",
        "Since Go 1.23 timer channels are unbuffered (cap 0) and Stop/Reset guarantee no stale value survives, so the pre-1.23 drain-before-Reset guard is no longer needed and len/cap now return 0.",
        "Ticker coalesces missed ticks (fixed-rate); fixed-delay requires Reset-after-completion; Sleep-in-loop drifts by the job's own runtime."
      ],
      "walkthrough": [
        {
          "title": "Capture monotonic start",
          "caption": "time.Now() records both a wall-clock time and a monotonic reading, and start keeps both so later elapsed math ignores wall-clock jumps.",
          "focus": [
            "start := time.Now()"
          ],
          "state": [
            {
              "k": "start",
              "v": "has monotonic"
            },
            {
              "k": "interval",
              "v": "40ms"
            }
          ]
        },
        {
          "title": "Create the ticker",
          "caption": "NewTicker starts a ticker that delivers a value on ticker.C roughly every 40ms; defer ensures Stop runs on return to release its resources.",
          "focus": [
            "ticker := time.NewTicker(interval)",
            "defer ticker.Stop()"
          ],
          "state": [
            {
              "k": "ticker.C",
              "v": "cap 1, empty"
            },
            {
              "k": "period",
              "v": "40ms"
            },
            {
              "k": "ctx budget",
              "v": "120ms"
            }
          ]
        },
        {
          "title": "Select blocks on two channels",
          "caption": "The loop parks in select, simultaneously waiting for ctx cancellation and for the next tick, resuming on whichever fires first.",
          "focus": [
            "select {",
            "case <-ctx.Done():"
          ],
          "state": [
            {
              "k": "blocked on",
              "v": "ctx.Done, ticker.C"
            },
            {
              "k": "ticks",
              "v": "0"
            },
            {
              "k": "elapsed",
              "v": "~0"
            }
          ]
        },
        {
          "title": "First tick fires",
          "caption": "At ~40ms the ticker sends on C, select takes that case, and work is invoked with time.Since(start) computed from the monotonic reading.",
          "focus": [
            "case <-ticker.C:",
            "work(time.Since(start))"
          ],
          "state": [
            {
              "k": "ticks",
              "v": "1"
            },
            {
              "k": "elapsed",
              "v": "~40ms"
            },
            {
              "k": "source",
              "v": "monotonic"
            }
          ]
        },
        {
          "title": "Monotonic immunity",
          "caption": "time.Since subtracts using the monotonic component, so even an NTP or DST wall-clock jump between start and now cannot corrupt the elapsed value.",
          "focus": [
            "work(time.Since(start))",
            "elapsed.Round(10*time.Millisecond)"
          ],
          "state": [
            {
              "k": "ticks",
              "v": "2 (~80ms)"
            },
            {
              "k": "wall jump",
              "v": "ignored"
            },
            {
              "k": "printed",
              "v": "~40ms, ~80ms"
            }
          ]
        },
        {
          "title": "Context times out",
          "caption": "Around 120ms ctx.Done() closes; select takes that case and poll returns. Whether a third tick prints first is a race, since that tick and the deadline are both ready near 120ms.",
          "focus": [
            "case <-ctx.Done():",
            "return"
          ],
          "state": [
            {
              "k": "ticks",
              "v": "~2-3"
            },
            {
              "k": "ctx",
              "v": "deadline exceeded"
            }
          ]
        },
        {
          "title": "Deferred Stop under 1.23+",
          "caption": "The deferred ticker.Stop() runs on return; since Go 1.23 the ticker is GC-eligible even if unstopped, and Stop guarantees no stale tick is delivered after it returns.",
          "focus": [
            "defer ticker.Stop()"
          ],
          "state": [
            {
              "k": "ticker",
              "v": "stopped"
            },
            {
              "k": "ticker.C",
              "v": "not closed"
            },
            {
              "k": "GC",
              "v": "reclaimable"
            }
          ]
        },
        {
          "title": "Round(0) strips monotonic",
          "caption": "time.Now().Round(0) removes the monotonic reading, yielding a pure wall-clock Time suitable for stable marshaling and equality; t.Equal(t) is trivially true.",
          "focus": [
            "t := time.Now().Round(0)",
            "t.Equal(t)"
          ],
          "state": [
            {
              "k": "t",
              "v": "wall-clock only"
            },
            {
              "k": "monotonic",
              "v": "stripped"
            },
            {
              "k": "t.Equal(t)",
              "v": "true"
            }
          ]
        }
      ]
    },
    {
      "id": "go-std-defer-idioms",
      "title": "defer patterns & resource cleanup",
      "difficulty": "Hard",
      "tags": [
        "defer",
        "resource-cleanup",
        "error-handling",
        "loops",
        "runtime"
      ],
      "summary": "LIFO defers, loop pitfalls, error-preserving close, and defer cost under Go 1.26.",
      "pattern": "Defer & cleanup",
      "visual": "Deferred calls push onto a per-goroutine LIFO stack, popped as the enclosing function returns — after the return value is assigned but before control leaves.",
      "memorize": "Defer = LIFO, args eval now / body runs later; loop bodies leak until func returns; name the return to catch Close errors.",
      "scene": "Imagine a stack of plates: each defer sets a plate on top; when the function ends you unstack top-first, and any plate can still scribble on the labeled 'return' card before it's handed off.",
      "time": "O(n) defers",
      "space": "O(n) stack",
      "code": "package main\n\nimport (\n\t\"errors\"\n\t\"fmt\"\n)\n\ntype resource struct {\n\tname string\n}\n\nfunc (r *resource) Close() error {\n\tif r.name == \"bad\" {\n\t\treturn fmt.Errorf(\"close %s: flush failed\", r.name)\n\t}\n\tfmt.Println(\"closed\", r.name)\n\treturn nil\n}\n\nfunc open(name string) (*resource, error) {\n\tif name == \"\" {\n\t\treturn nil, errors.New(\"empty name\")\n\t}\n\treturn &resource{name: name}, nil\n}\n\n// process opens two resources and guarantees cleanup even on partial failure.\n// The named return err is rewritten by the deferred close so a flush error is\n// not silently swallowed.\nfunc process(a, b string) (err error) {\n\tra, err := open(a)\n\tif err != nil {\n\t\treturn err\n\t}\n\tdefer func() {\n\t\tif cerr := ra.Close(); cerr != nil && err == nil {\n\t\t\terr = cerr\n\t\t}\n\t}()\n\n\trb, err := open(b)\n\tif err != nil {\n\t\treturn err\n\t}\n\tdefer func() {\n\t\tif cerr := rb.Close(); cerr != nil && err == nil {\n\t\t\terr = cerr\n\t\t}\n\t}()\n\n\tfmt.Println(\"processing\", ra.name, rb.name)\n\treturn nil\n}\n\nfunc main() {\n\tnames := []string{\"ok\", \"bad\"}\n\tfor _, n := range names {\n\t\tif err := process(\"main\", n); err != nil {\n\t\t\tfmt.Println(\"error:\", err)\n\t\t}\n\t}\n}\n",
      "quiz": [
        {
          "id": "return-value-mutation",
          "prompt": "A function has signature `func f() (err error)` and its body does `defer func() { err = wrap(err) }(); return doWork()`. When does the deferred closure observe/modify `err`?",
          "choices": [
            {
              "label": "After assignment — return value set then defer runs",
              "correct": true
            },
            {
              "label": "Never — return snapshots err first",
              "correct": false
            },
            {
              "label": "Before doWork — defers run at entry",
              "correct": false
            },
            {
              "label": "Only on panic — defers skip normal returns",
              "correct": false
            }
          ],
          "explain": "A `return x` statement first assigns the named result (err = the error from doWork()), then runs deferred calls, then transfers control. Because the result is a named variable, the deferred closure can read and overwrite it, so wrap(err) takes effect on the value actually returned."
        },
        {
          "id": "defer-args-eval",
          "prompt": "`i := 0; defer fmt.Println(i); i = 42` — what does the deferred call print, and why?",
          "choices": [
            {
              "label": "0 — arguments evaluated at defer statement",
              "correct": true
            },
            {
              "label": "42 — args read when the call executes",
              "correct": false
            },
            {
              "label": "Compile error — defer needs a closure",
              "correct": false
            },
            {
              "label": "Garbage — i already out of scope",
              "correct": false
            }
          ],
          "explain": "Deferred call arguments are evaluated immediately when the defer statement executes, not when the deferred function later runs. So i's value 0 is captured; the subsequent i = 42 has no effect. Wrapping the call in a closure `defer func(){ fmt.Println(i) }()` would instead read i at run time and print 42."
        },
        {
          "id": "defer-in-loop",
          "prompt": "Inside a single function you loop over 10000 files and write `f, _ := os.Open(path); defer f.Close()` in the loop body. What is the primary defect?",
          "choices": [
            {
              "label": "Descriptors leak — closes wait until func returns",
              "correct": true
            },
            {
              "label": "Nothing wrong — each iteration closes its file",
              "correct": false
            },
            {
              "label": "Compile error — defer illegal inside for",
              "correct": false
            },
            {
              "label": "Immediate double close — defer fires twice",
              "correct": false
            }
          ],
          "explain": "Defers are function-scoped, not block-scoped, so all 10000 Close calls are queued and only run when the enclosing function returns — meanwhile every descriptor stays open, risking exhaustion (EMFILE). The fix is a helper function invoked per iteration so each defer fires promptly, or closing explicitly at the end of the iteration."
        },
        {
          "id": "loopvar-1-22",
          "prompt": "A function loops `for _, v := range items { defer fmt.Println(v) }` where items = [\"a\",\"b\",\"c\"]. What prints when the function returns, under both Go 1.22+ and pre-1.22 semantics?",
          "choices": [
            {
              "label": "LIFO with early args — output is c b a",
              "correct": true
            },
            {
              "label": "c c c — single shared v reused",
              "correct": false
            },
            {
              "label": "a b c — defers run in queue order",
              "correct": false
            },
            {
              "label": "Same value thrice — prints a a a via late capture",
              "correct": false
            }
          ],
          "explain": "Because `defer fmt.Println(v)` passes v as an argument, v is evaluated at each defer statement (a, then b, then c), so the loop-variable change in Go 1.22 is irrelevant here — the values a, b, c are captured either way. Defers unwind LIFO, printing c, b, a. The classic pre-1.22 c-c-c bug only appears with a closure like `defer func(){ fmt.Println(v) }()` that reads the shared variable at run time."
        },
        {
          "id": "defer-panic-recover",
          "prompt": "Two defers are registered: first `defer a()`, then `defer b()`. The function body panics. Which runs first, and can it stop the panic?",
          "choices": [
            {
              "label": "b first — LIFO and recover here aborts panic",
              "correct": true
            },
            {
              "label": "a first — defers run in registration order",
              "correct": false
            },
            {
              "label": "Neither — panic skips all deferred calls",
              "correct": false
            },
            {
              "label": "b first — but recover cannot halt active panic",
              "correct": false
            }
          ],
          "explain": "Defers always unwind last-registered-first, so b() runs before a(), even during a panic. A recover() called directly inside b() stops the panicking sequence, after which a() runs normally as unwinding continues and the function returns without re-panicking."
        },
        {
          "id": "defer-cost",
          "prompt": "A senior engineer claims 'defer is essentially free in modern Go, so use it everywhere including hot inner loops.' What is the most accurate correction under Go 1.26?",
          "choices": [
            {
              "label": "Open-coded defers — near-free but not in loops",
              "correct": true
            },
            {
              "label": "Defer always heap-allocates — avoid it entirely",
              "correct": false
            },
            {
              "label": "Defer is truly free — identical to direct call",
              "correct": false
            },
            {
              "label": "Defer is 10x slower — always inline cleanup",
              "correct": false
            }
          ],
          "explain": "Since Go 1.14 the compiler open-codes defers (a statically known count, up to 8 per function) making them nearly as cheap as a direct call, but defers placed inside loops or with a dynamic count fall back to the slower runtime.deferproc path that can allocate. So the nuance is: cheap in straight-line code, potentially costly in loops or dynamic sites."
        }
      ],
      "design": {
        "prompt": "You are designing the resource-cleanup and error-handling conventions for a large Go service that opens files, DB transactions, and network connections in many functions. How do you standardize defer usage so that Close/Rollback errors are never silently dropped, cleanup is correct on both success and error paths, and hot paths stay fast? Discuss tradeoffs.",
        "answer": "The core idiom is the named-return-plus-deferred-close pattern: `func f() (err error) { ... defer func(){ if cerr := c.Close(); cerr != nil && err == nil { err = cerr } }() }`, which captures a cleanup error only when the main path succeeded, so a flush/commit failure surfaces instead of being lost. For transactions, prefer `defer tx.Rollback()` where Rollback is a no-op after a successful Commit, giving an unconditional safety net. The key pitfall is defer-in-loop: because defers are function-scoped, opening resources in a loop and deferring their close leaks descriptors until the function returns; the remedy is to extract a per-iteration helper function so each defer fires promptly, or to close explicitly at the end of the iteration. On cost, defers are open-coded and nearly free in straight-line code (Go 1.14+), but in tight loops or with dynamic counts they hit the slower runtime path and may allocate, so in genuine hot loops measure and consider explicit cleanup. For multiple resources, remember LIFO unwinding gives correct reverse-order teardown (close inner before outer). A reasonable recommendation: adopt named returns with the error-merging deferred close as the house style for anything returning an error, forbid raw defer inside loops via linting (revive/errcheck plus a custom vet check), and reserve manual cleanup only for profiled hot paths — favoring correctness and readability everywhere else."
      },
      "keyPoints": [
        "Defer arguments are evaluated at the defer statement; only a closure body reads later mutations at run time.",
        "Defers unwind LIFO and run after the (named) return value is assigned but before control leaves — enabling error rewriting.",
        "Defers are function-scoped, not block-scoped: defer-in-loop leaks resources until the function returns; extract a helper per iteration.",
        "Go 1.22's fresh loop variable only matters for closures capturing the variable; `defer f(v)` already captured v at defer time in every Go version.",
        "Open-coded defers are near-free in straight-line code; loop/dynamic defers fall back to runtime.deferproc and may allocate.",
        "Merge cleanup errors via `if cerr := c.Close(); cerr != nil && err == nil { err = cerr }` on a named return so Close/Commit failures are not dropped."
      ],
      "walkthrough": [
        {
          "title": "Loop enters, call process(\"main\",\"ok\")",
          "caption": "main ranges over names and calls process with b=\"ok\" first; execution jumps into process with named return err zero-valued to nil.",
          "focus": [
            "for _, n := range names {",
            "if err := process(\"main\", n); err != nil {"
          ],
          "state": [
            {
              "k": "n",
              "v": "\"ok\""
            },
            {
              "k": "err (named)",
              "v": "nil"
            }
          ]
        },
        {
          "title": "Open ra, register defer A",
          "caption": "open(\"main\") succeeds so ra points to a live resource, then the first deferred closure is pushed onto process's defer stack (its body does not run yet).",
          "focus": [
            "ra, err := open(a)",
            "defer func() {",
            "if cerr := ra.Close(); cerr != nil && err == nil {"
          ],
          "state": [
            {
              "k": "ra.name",
              "v": "\"main\""
            },
            {
              "k": "defer stack",
              "v": "[A]"
            },
            {
              "k": "err",
              "v": "nil"
            }
          ]
        },
        {
          "title": "Open rb, register defer B",
          "caption": "open(\"ok\") succeeds and a second closure is pushed above A; deferred calls run LIFO so B will fire before A on return.",
          "focus": [
            "rb, err := open(b)",
            "defer func() {",
            "if cerr := rb.Close(); cerr != nil && err == nil {"
          ],
          "state": [
            {
              "k": "rb.name",
              "v": "\"ok\""
            },
            {
              "k": "defer stack",
              "v": "[A, B]"
            },
            {
              "k": "order",
              "v": "B then A"
            }
          ]
        },
        {
          "title": "Return nil triggers LIFO unwind",
          "caption": "the body finishes and returns nil, then B runs first closing rb (\"ok\") and A runs second closing ra (\"main\"), both leaving named err as nil.",
          "focus": [
            "return nil",
            "if cerr := rb.Close(); cerr != nil && err == nil {",
            "if cerr := ra.Close(); cerr != nil && err == nil {"
          ],
          "state": [
            {
              "k": "closed order",
              "v": "ok, main"
            },
            {
              "k": "err returned",
              "v": "nil"
            }
          ]
        },
        {
          "title": "Second iteration: process(\"main\",\"bad\")",
          "caption": "the loop calls process again with b=\"bad\", re-opening ra=\"main\" and rb=\"bad\" and re-registering both defers on a fresh stack.",
          "focus": [
            "defer func() {",
            "if cerr := ra.Close(); cerr != nil && err == nil {",
            "rb, err := open(b)"
          ],
          "state": [
            {
              "k": "ra.name",
              "v": "\"main\""
            },
            {
              "k": "rb.name",
              "v": "\"bad\""
            },
            {
              "k": "defer stack",
              "v": "[A, B]"
            },
            {
              "k": "err",
              "v": "nil"
            }
          ]
        },
        {
          "title": "GOTCHA: Close error rewrites named return",
          "caption": "return nil sets err=nil, but deferred B calls rb.Close() which returns a flush error; because err==nil the closure overwrites the named return with cerr instead of swallowing it.",
          "focus": [
            "return nil",
            "return fmt.Errorf(\"close %s: flush failed\", r.name)",
            "err = cerr"
          ],
          "state": [
            {
              "k": "return value pre-defer",
              "v": "nil"
            },
            {
              "k": "cerr",
              "v": "\"close bad: flush failed\""
            },
            {
              "k": "err after B",
              "v": "cerr"
            }
          ]
        },
        {
          "title": "Defer A guarded by err==nil",
          "caption": "A then closes ra (\"main\") successfully, but since err is now non-nil the guard skips reassignment so the earlier flush error is preserved and process returns it.",
          "focus": [
            "if cerr := ra.Close(); cerr != nil && err == nil {",
            "fmt.Println(\"closed\", r.name)"
          ],
          "state": [
            {
              "k": "ra Close",
              "v": "nil"
            },
            {
              "k": "err preserved",
              "v": "\"close bad: flush failed\""
            }
          ]
        },
        {
          "title": "main prints the surfaced error",
          "caption": "back in main the non-nil err from the \"bad\" iteration is printed, proving the deferred close surfaced a failure a naked return would have hidden.",
          "focus": [
            "fmt.Println(\"error:\", err)"
          ],
          "state": [
            {
              "k": "output",
              "v": "error: close bad: flush failed"
            }
          ]
        }
      ]
    }
  ]
};
