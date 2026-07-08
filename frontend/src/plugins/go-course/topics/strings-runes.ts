import type { GoTopic } from '../types';

export const stringsRunes: GoTopic = {
  id: 'strings-runes',
  title: 'Strings, Bytes & Runes',
  icon: 'Hash',
  concepts: [
    {
      id: 'go-str-immutable',
      title: 'Strings are immutable, read-only byte sequences',
      difficulty: 'Easy',
      tags: ['strings', 'immutable', 'bytes'],
      summary:
        'A Go string is an immutable read-only slice of bytes; you cannot assign into it by index.',
      pattern: 'Immutable string',
      visual:
        'A string is a (pointer, length) header over read-only bytes; to "edit" you build a new string.',
      memorize: 'Strings never mutate. s[i] reads a byte; s[i] = x does not compile.',
      scene:
        'A string is words carved in stone: you can read any letter, but to change one you must carve a whole new tablet.',
      time: 'O(n)',
      space: 'O(n)',
      code: 'package main\n\nimport "fmt"\n\nfunc main() {\n\ts := "hello"\n\tfmt.Println(s[0], len(s))\n\n\tb := []byte(s)\n\tb[0] = \'H\'\n\ts2 := string(b)\n\n\tfmt.Println(s)\n\tfmt.Println(s2)\n}\n',
      keyPoints: [
        'A string value is a 2-word header: a pointer to bytes and a length; the underlying bytes are read-only.',
        'Indexing s[i] yields a byte (uint8), NOT a character; there is no rune at s[i].',
        'Assigning s[i] = x is a compile error — the gotcha is you must convert to []byte, mutate, then convert back.',
        'Converting string ↔ []byte copies the bytes, preserving immutability of the original string.',
      ],
      walkthrough: [
        {
          title: 'Read a byte',
          caption:
            's[0] returns the byte value 104 (ASCII h), and len reports the byte count, not the character count.',
          focus: ['fmt.Println(s[0], len(s))'],
          state: [
            { k: 's[0]', v: '104' },
            { k: 'len', v: '5' },
          ],
        },
        {
          title: 'Copy into a mutable slice',
          caption:
            'To change bytes you convert to []byte, which copies the data so the original string stays untouched.',
          focus: ['b := []byte(s)'],
          state: [{ k: 'b', v: '[104 101 108 108 111]' }],
        },
        {
          title: 'Mutate the copy',
          caption: 'Assigning into the byte slice is allowed; b[0] becomes 72 (ASCII H).',
          focus: ["b[0] = 'H'"],
          state: [{ k: 'b[0]', v: '72' }],
        },
        {
          title: 'Rebuild a string',
          caption:
            'string(b) copies the mutated bytes into a fresh immutable string; s is unchanged.',
          focus: ['s2 := string(b)'],
          state: [
            { k: 's', v: 'hello' },
            { k: 's2', v: 'Hello' },
          ],
        },
      ],
    },
    {
      id: 'go-str-runes-bytes',
      title: 'Bytes vs runes and UTF-8 encoding',
      difficulty: 'Medium',
      tags: ['runes', 'bytes', 'utf-8', 'unicode'],
      summary:
        'A byte is one uint8 of UTF-8; a rune is an int32 Unicode code point that may span multiple bytes.',
      pattern: 'Bytes vs runes',
      visual:
        'len counts UTF-8 bytes; []rune decodes code points, so multibyte characters shrink the count.',
      memorize:
        'byte = uint8 (one UTF-8 byte). rune = int32 (one code point). len = bytes, not chars.',
      scene:
        'A string is a ribbon of bytes; some letters (é, 世) are printed with two or three bytes glued together into one rune.',
      time: 'O(n)',
      space: 'O(n)',
      code: 'package main\n\nimport (\n\t"fmt"\n\t"unicode/utf8"\n)\n\nfunc main() {\n\ts := "héllo"\n\n\tfmt.Println(len(s))\n\tfmt.Println(utf8.RuneCountInString(s))\n\n\tr := []rune(s)\n\tfmt.Println(len(r))\n\tfmt.Printf("%c %d\\n", r[1], r[1])\n}\n',
      keyPoints: [
        'byte is an alias for uint8 (one raw UTF-8 byte); rune is an alias for int32 (one Unicode code point).',
        'Go source is UTF-8, so a string literal like "héllo" stores é as two bytes.',
        'len(s) returns the BYTE count; use utf8.RuneCountInString or []rune to count characters — the classic gotcha.',
        '[]rune(s) fully decodes the string into code points, allocating a new int32 slice.',
      ],
      walkthrough: [
        {
          title: 'Byte length',
          caption: 'len counts UTF-8 bytes; é is two bytes so "héllo" is 6 bytes, not 5.',
          focus: ['fmt.Println(len(s))'],
          state: [{ k: 'len(s)', v: '6' }],
        },
        {
          title: 'Rune count',
          caption: 'utf8.RuneCountInString decodes the bytes and counts 5 actual code points.',
          focus: ['utf8.RuneCountInString(s)'],
          state: [{ k: 'runes', v: '5' }],
        },
        {
          title: 'Decode to runes',
          caption:
            '[]rune(s) produces a slice of int32 code points; its length is the character count, 5.',
          focus: ['r := []rune(s)'],
          state: [{ k: 'len(r)', v: '5' }],
        },
        {
          title: 'Inspect one rune',
          caption: 'r[1] is é; %c prints the character and %d prints its code point value 233.',
          focus: ['%c %d'],
          state: [{ k: 'r[1]', v: 'é (233)' }],
        },
      ],
    },
    {
      id: 'go-str-range',
      title: 'Ranging a string decodes runes; indexing yields a byte',
      difficulty: 'Medium',
      tags: ['range', 'runes', 'strings', 'utf-8'],
      summary:
        'for..range over a string yields byte-offset + decoded rune; direct indexing yields a single byte.',
      pattern: 'range string',
      visual:
        'range decodes one UTF-8 rune per step and reports the starting byte index, which can jump by >1.',
      memorize:
        'range string → (byteIndex, rune). s[i] → byte. Index is a byte offset, not a rune count.',
      scene:
        'Walking a string with range is stepping stone to stone; a wide stone (multibyte rune) makes the next index leap ahead.',
      time: 'O(n)',
      space: 'O(1)',
      code: 'package main\n\nimport "fmt"\n\nfunc main() {\n\ts := "a世b"\n\n\tfor i, r := range s {\n\t\tfmt.Printf("%d:%c ", i, r)\n\t}\n\tfmt.Println()\n\n\tfmt.Println(s[1])\n}\n',
      keyPoints: [
        'range over a string yields the starting BYTE index and the decoded rune (int32), not consecutive integers.',
        'The index jumps by the rune width, so a 3-byte rune advances the next index by 3.',
        'Indexing s[i] returns the raw byte at that offset — often a UTF-8 continuation byte, not a character.',
        'Invalid UTF-8 in a range yields the replacement rune U+FFFD without stopping the loop.',
      ],
      walkthrough: [
        {
          title: 'First rune',
          caption: 'At byte index 0 range decodes the single-byte rune a.',
          focus: ['for i, r := range s {'],
          state: [
            { k: 'i', v: '0' },
            { k: 'r', v: 'a' },
          ],
        },
        {
          title: 'Multibyte rune',
          caption:
            '世 is three UTF-8 bytes, so it appears at index 1 and the following index leaps to 4.',
          focus: ['%d:%c '],
          state: [
            { k: 'i', v: '1' },
            { k: 'r', v: '世' },
          ],
        },
        {
          title: 'Index jumped',
          caption:
            'The final rune b lands at byte index 4 because 世 consumed indices 1, 2, and 3.',
          focus: ['s := "a世b"'],
          state: [
            { k: 'i', v: '4' },
            { k: 'r', v: 'b' },
          ],
        },
        {
          title: 'Raw byte indexing',
          caption:
            's[1] is the first byte of 世 — a continuation byte 228, not the character itself.',
          focus: ['fmt.Println(s[1])'],
          state: [{ k: 's[1]', v: '228' }],
        },
      ],
    },
    {
      id: 'go-str-builder',
      title: 'strings.Builder for efficient concatenation',
      difficulty: 'Easy',
      tags: ['strings', 'builder', 'performance'],
      summary:
        'strings.Builder accumulates bytes in a growable buffer and returns the result with zero final copy.',
      pattern: 'strings.Builder',
      visual:
        'Write into a growing byte buffer, then String() hands back the bytes without re-copying them.',
      memorize: 'Loop concatenation is O(n²); strings.Builder + WriteString is amortized O(n).',
      scene:
        'Instead of re-photocopying the whole letter for each new word, Builder keeps one growing scroll and only reads it out at the end.',
      time: 'O(n)',
      space: 'O(n)',
      code: 'package main\n\nimport (\n\t"fmt"\n\t"strings"\n)\n\nfunc main() {\n\tvar b strings.Builder\n\tfor i := 0; i < 3; i++ {\n\t\tfmt.Fprintf(&b, "n%d ", i)\n\t}\n\tb.WriteString("done")\n\n\tfmt.Println(b.String())\n\tfmt.Println(b.Len())\n}\n',
      keyPoints: [
        'Repeated s += x is O(n²) because each += allocates and copies the whole string so far.',
        'strings.Builder writes into an internal []byte and grows it, giving amortized O(n) total work.',
        'String() returns the buffer without a final copy by using an unsafe conversion internally.',
        'The gotcha: never copy a Builder value after first use — it holds a pointer to itself; pass it by pointer.',
      ],
      walkthrough: [
        {
          title: 'Declare the builder',
          caption: 'The zero value of strings.Builder is ready to use — no constructor needed.',
          focus: ['var b strings.Builder'],
          state: [{ k: 'b.Len()', v: '0' }],
        },
        {
          title: 'Append in a loop',
          caption:
            'Fprintf writes into the builder via its io.Writer interface, appending "n0 ", "n1 ", "n2 ".',
          focus: ['fmt.Fprintf(&b, "n%d ", i)'],
          state: [{ k: 'buffer', v: 'n0 n1 n2 ' }],
        },
        {
          title: 'Write a final chunk',
          caption: 'WriteString appends "done" directly to the same growing buffer.',
          focus: ['b.WriteString("done")'],
          state: [{ k: 'buffer', v: 'n0 n1 n2 done' }],
        },
        {
          title: 'Extract the result',
          caption: 'String() returns the accumulated text; Len reports its byte length, 13.',
          focus: ['b.String()'],
          state: [
            { k: 'result', v: 'n0 n1 n2 done' },
            { k: 'b.Len()', v: '13' },
          ],
        },
      ],
    },
    {
      id: 'go-str-strconv',
      title: 'Converting numbers and strings with strconv',
      difficulty: 'Easy',
      tags: ['strconv', 'parsing', 'conversion'],
      summary:
        'strconv parses and formats numbers; Atoi/Itoa handle base-10 ints and return an error on bad input.',
      pattern: 'strconv parse',
      visual:
        'Atoi parses text to int returning (value, error); Itoa formats an int back to a base-10 string.',
      memorize:
        'Atoi = ASCII→int, Itoa = int→ASCII. ParseFloat/ParseInt for bases and floats. Always check err.',
      scene:
        'strconv is the translator booth between the language of digits-as-text and the language of machine numbers.',
      time: 'O(n)',
      space: 'O(1)',
      code: 'package main\n\nimport (\n\t"fmt"\n\t"strconv"\n)\n\nfunc main() {\n\tn, err := strconv.Atoi("42")\n\tfmt.Println(n, err)\n\n\t_, err = strconv.Atoi("4x")\n\tfmt.Println(err != nil)\n\n\ts := strconv.Itoa(n * 2)\n\tf, _ := strconv.ParseFloat("3.5", 64)\n\tfmt.Println(s, f)\n}\n',
      keyPoints: [
        'strconv.Atoi(s) parses a base-10 string and returns (int, error) — always check the error.',
        'strconv.Itoa(n) is the reverse, formatting an int as a base-10 string with no error.',
        'ParseInt and ParseFloat take an explicit base and bit size for wider control (e.g. ParseInt(s, 16, 64)).',
        'The gotcha: string(65) is NOT "65" — it yields the rune "A"; use strconv.Itoa to stringify a number.',
      ],
      walkthrough: [
        {
          title: 'Parse a valid int',
          caption: 'Atoi("42") returns the int 42 and a nil error.',
          focus: ['strconv.Atoi("42")'],
          state: [
            { k: 'n', v: '42' },
            { k: 'err', v: '<nil>' },
          ],
        },
        {
          title: 'Handle bad input',
          caption:
            'Atoi("4x") cannot parse, so it returns 0 and a non-nil *NumError; err != nil is true.',
          focus: ['strconv.Atoi("4x")'],
          state: [{ k: 'err != nil', v: 'true' }],
        },
        {
          title: 'Format back to string',
          caption: 'Itoa turns 84 (n*2) into the string "84".',
          focus: ['strconv.Itoa(n * 2)'],
          state: [{ k: 's', v: '84' }],
        },
        {
          title: 'Parse a float',
          caption: 'ParseFloat("3.5", 64) yields the float64 value 3.5.',
          focus: ['strconv.ParseFloat("3.5", 64)'],
          state: [{ k: 'f', v: '3.5' }],
        },
      ],
    },
    {
      id: 'go-str-ops',
      title: 'Common strings package operations (Split, Join, Fields, TrimSpace)',
      difficulty: 'Easy',
      tags: ['strings', 'split', 'join', 'fields'],
      summary:
        'The strings package covers everyday text work: Split, Join, Fields, TrimSpace, Contains, and more.',
      pattern: 'strings ops',
      visual:
        'Split cuts on a separator; Fields splits on runs of whitespace; Join glues a slice; TrimSpace strips edges.',
      memorize:
        'Split(sep) keeps empties; Fields splits on whitespace and drops empties; Join is Split reversed.',
      scene:
        'A text toolbox: scissors (Split/Fields), glue (Join), and an eraser for the margins (TrimSpace).',
      time: 'O(n)',
      space: 'O(n)',
      code: 'package main\n\nimport (\n\t"fmt"\n\t"strings"\n)\n\nfunc main() {\n\tparts := strings.Split("a,b,c", ",")\n\tfmt.Println(parts, len(parts))\n\n\tfmt.Println(strings.Join(parts, "-"))\n\tfmt.Println(strings.Fields("  x   y "))\n\tfmt.Printf("%q\\n", strings.TrimSpace("  hi \\n"))\n\tfmt.Println(strings.Contains("golang", "lang"))\n}\n',
      keyPoints: [
        'Split(s, sep) cuts on every separator and KEEPS empty substrings between adjacent separators.',
        'Fields(s) splits on runs of Unicode whitespace and drops empties — ideal for tokenizing free-form input.',
        'Join(slice, sep) is the inverse of Split, concatenating with the separator between elements.',
        'TrimSpace strips leading and trailing whitespace only; Contains reports substring presence as a bool.',
      ],
      walkthrough: [
        {
          title: 'Split on a separator',
          caption: 'Split("a,b,c", ",") returns a 3-element slice [a b c].',
          focus: ['strings.Split("a,b,c", ",")'],
          state: [
            { k: 'parts', v: '[a b c]' },
            { k: 'len', v: '3' },
          ],
        },
        {
          title: 'Join a slice',
          caption: 'Join glues the parts back with "-" to produce "a-b-c".',
          focus: ['strings.Join(parts, "-")'],
          state: [{ k: 'joined', v: 'a-b-c' }],
        },
        {
          title: 'Split on whitespace',
          caption: 'Fields collapses runs of spaces and drops empties, returning [x y].',
          focus: ['strings.Fields("  x   y ")'],
          state: [{ k: 'fields', v: '[x y]' }],
        },
        {
          title: 'Trim and test',
          caption:
            'TrimSpace strips surrounding whitespace to "hi"; Contains confirms "lang" is inside "golang".',
          focus: ['strings.TrimSpace("  hi \\n")'],
          state: [
            { k: 'trimmed', v: '"hi"' },
            { k: 'contains', v: 'true' },
          ],
        },
      ],
    },
  ],
};
