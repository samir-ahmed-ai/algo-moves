import type { GoTopic } from '../types';

// AUTO-GENERATED go-course topic — authored & Go-1.26-verified content.
export const slicesMaps: GoTopic = {
  id: 'slices-maps',
  title: 'Slices, Maps & Data',
  icon: 'Table',
  concepts: [
    {
      id: 'go-data-slice-internals',
      title: 'Slice header, len, cap & append growth',
      difficulty: 'Hard',
      tags: ['slices', 'append', 'memory', 'runtime', 'aliasing'],
      summary:
        'How the {ptr,len,cap} header, append reallocation, and three-index slicing govern backing-array sharing.',
      pattern: 'Slice internals',
      visual:
        'A slice is a 3-word header (ptr,len,cap); append reallocates only when len==cap, otherwise it writes into the shared backing array.',
      memorize:
        'Header = ptr+len+cap; append aliases backing until len>cap; s[lo:hi:max] caps sharing.',
      scene:
        'Picture a library card (the header) pointing at a shelf (backing array): copy the card and both readers rearrange the same books — until append buys a new shelf and quietly rewrites your card.',
      time: 'O(1) amortized append',
      space: 'O(n) backing array',
      code: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tbacking := make([]int, 5, 8)\n\tfor i := range backing {\n\t\tbacking[i] = i\n\t}\n\n\t// Three-index slice: len=2, cap=3 -> appends within cap mutate backing.\n\tview := backing[1:3:4]\n\tfmt.Printf("view len=%d cap=%d\\n", len(view), cap(view))\n\n\tview = append(view, 99)\n\tfmt.Println("backing after in-cap append:", backing)\n\n\t// This append exceeds cap=3, forcing reallocation; backing is now detached.\n\tview = append(view, 100)\n\tview[0] = -1\n\tfmt.Println("backing after realloc append:", backing)\n\tfmt.Println("view detached:", view)\n\n\t// Growth: append reallocates only when len==cap.\n\ts := []int{}\n\tprev := cap(s)\n\tgrowths := 0\n\tfor i := 0; i < 2048; i++ {\n\t\ts = append(s, i)\n\t\tif cap(s) != prev {\n\t\t\tprev = cap(s)\n\t\t\tgrowths++\n\t\t}\n\t}\n\tfmt.Println("reallocations for 2048 appends:", growths)\n}\n',
      keyPoints: [
        'A slice is a 3-word header {ptr,len,cap}; assigning or passing a slice copies the header, not the backing array.',
        'append writes into the shared backing array while len<cap and only reallocates (detaching the slice) when len==cap.',
        'Capacity grows geometrically (roughly 2x below 256, tapering toward ~1.25x for large slices), giving amortized O(1) append.',
        'Three-index slicing s[low:high:max] sets cap=max-low, letting you force the next append to reallocate instead of aliasing.',
        'Returning sub-slices of a big buffer retains the whole backing array for the GC — clone to release it.',
        'A same-cap or overlapping-cap sibling slice can be corrupted by an in-cap append; s[i:j:j] prevents this.',
      ],
      walkthrough: [
        {
          title: 'Allocate backing array',
          caption:
            'make builds a header {ptr, len=5, cap=8} pointing at an 8-element backing array whose first five slots are then filled 0..4.',
          focus: ['backing := make([]int, 5, 8)', 'backing[i] = i'],
          state: [
            {
              k: 'backing len',
              v: '5',
            },
            {
              k: 'backing cap',
              v: '8',
            },
            {
              k: 'backing',
              v: '[0 1 2 3 4]',
            },
          ],
        },
        {
          title: 'Three-index reslice',
          caption:
            "view shares backing's array starting at index 1; the third index 4 caps its capacity, so len=hi-lo=2 and cap=max-lo=3.",
          focus: ['view := backing[1:3:4]'],
          state: [
            {
              k: 'view len',
              v: '2',
            },
            {
              k: 'view cap',
              v: '3',
            },
            {
              k: 'view',
              v: '[1 2]',
            },
            {
              k: 'aliases backing',
              v: 'yes',
            },
          ],
        },
        {
          title: 'Confirm len and cap',
          caption:
            'Printf reports len=2 cap=3, showing the three-index slice deliberately restricted capacity below what the backing array could otherwise offer.',
          focus: ['fmt.Printf("view len=%d cap=%d\\n", len(view), cap(view))'],
          state: [
            {
              k: 'view len',
              v: '2',
            },
            {
              k: 'view cap',
              v: '3',
            },
          ],
        },
        {
          title: 'In-cap append mutates backing',
          caption:
            'append fits within cap (len 2 < 3) so it writes 99 into the shared backing slot at index 3 in place, no reallocation.',
          focus: [
            'view = append(view, 99)',
            'fmt.Println("backing after in-cap append:", backing)',
          ],
          state: [
            {
              k: 'view len',
              v: '3',
            },
            {
              k: 'view cap',
              v: '3',
            },
            {
              k: 'view',
              v: '[1 2 99]',
            },
            {
              k: 'backing',
              v: '[0 1 2 99 4]',
            },
          ],
        },
        {
          title: 'Over-cap append reallocates',
          caption:
            "Now len==cap==3, so append allocates a fresh larger array, copies view's elements into it, and rebinds view — detaching it from backing.",
          focus: ['view = append(view, 100)', 'view[0] = -1'],
          state: [
            {
              k: 'view len',
              v: '4',
            },
            {
              k: 'view cap',
              v: '6',
            },
            {
              k: 'view',
              v: '[-1 2 99 100]',
            },
            {
              k: 'aliases backing',
              v: 'no',
            },
          ],
        },
        {
          title: 'Backing stays untouched',
          caption:
            'Because view now points at a new array, writing view[0]=-1 and appending 100 leave backing frozen at [0 1 2 99 4].',
          focus: [
            'fmt.Println("backing after realloc append:", backing)',
            'fmt.Println("view detached:", view)',
          ],
          state: [
            {
              k: 'backing',
              v: '[0 1 2 99 4]',
            },
            {
              k: 'view detached',
              v: '[-1 2 99 100]',
            },
          ],
        },
        {
          title: 'Growth loop',
          caption:
            'Starting from an empty non-nil slice, each append that finds len==cap triggers a reallocation to a larger backing array, counted via cap changes.',
          focus: ['s := []int{}', 's = append(s, i)', 'if cap(s) != prev {'],
          state: [
            {
              k: 'iterations',
              v: '2048',
            },
            {
              k: 'start cap',
              v: '0',
            },
            {
              k: 'grows when',
              v: 'len==cap',
            },
          ],
        },
        {
          title: 'Amortized reallocations',
          caption:
            'Over 2048 appends the capacity roughly doubles (then grows more gently past the ~256/512 threshold), yielding only 12 reallocations — amortized O(1) per append.',
          focus: ['fmt.Println("reallocations for 2048 appends:", growths)'],
          state: [
            {
              k: 'growths',
              v: '12',
            },
            {
              k: 'final len',
              v: '2048',
            },
            {
              k: 'amortized cost',
              v: 'O(1)',
            },
          ],
        },
      ],
    },
    {
      id: 'go-data-slice-aliasing',
      title: 'Slice aliasing & the append gotcha',
      difficulty: 'Hard',
      tags: ['slices', 'append', 'memory', 'aliasing', 'copy'],
      summary:
        'Subslices share a backing array, so append can silently clobber data unless you cap capacity or copy().',
      pattern: 'Slice aliasing',
      visual:
        'A slice is a (ptr,len,cap) header; two headers over one array; append writes in place while cap>len, else reallocates.',
      memorize:
        'Same backing array until append reallocates; cap>len? in-place clobber. copy() or s[a:b:b] to detach.',
      scene:
        'Two window frames bolted onto the same wall: paint through one window and the smudge shows through the other — until you knock a new wall into place (realloc).',
      time: 'copy() is O(n)',
      space: 'copy() allocates O(n)',
      code: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tbase := make([]int, 3, 5)\n\tbase[0], base[1], base[2] = 1, 2, 3\n\n\t// view shares the same backing array as base.\n\tview := base[0:2]\n\tfmt.Printf("view=%v len=%d cap=%d\\n", view, len(view), cap(view))\n\n\t// append has spare capacity, so it writes into base[2] in place,\n\t// silently clobbering the shared element.\n\tview = append(view, 99)\n\tfmt.Printf("after append view=%v base=%v\\n", view, base)\n\n\t// Detach with copy to get an independent backing array.\n\tdetached := make([]int, len(base))\n\tcopy(detached, base)\n\tdetached[0] = -1\n\tfmt.Printf("detached=%v base=%v\\n", detached, base)\n\n\t// A full-slice expression caps capacity so append reallocates.\n\tsafe := base[0:2:2]\n\tsafe = append(safe, 7)\n\tfmt.Printf("safe=%v base=%v\\n", safe, base)\n\n\t// nil vs empty: distinct headers, both len 0, both range-safe.\n\tvar nilSlice []int\n\temptySlice := []int{}\n\tfmt.Printf("nil==nil? %v empty==nil? %v\\n", nilSlice == nil, emptySlice == nil)\n\tfmt.Printf("len nil=%d len empty=%d\\n", len(nilSlice), len(emptySlice))\n}\n',
      keyPoints: [
        'A slice is a (pointer, len, cap) header; two slices over one array alias the same memory until one of them reallocates.',
        'append writes in place when cap>len (clobbering shared elements) and only allocates a new array when it runs out of capacity.',
        'The full-slice expression s[a:b:c] caps capacity; s[a:b:b] forces the next append to reallocate, isolating the subslice.',
        'copy(dst, src) copies min(len(dst),len(src)) elements, never grows dst, and returns the count copied; it is the idiomatic way to detach.',
        'nil and empty slices both have len 0 and range safely, but nil==nil is true while empty==nil is false (and they marshal differently in JSON).',
        'For public APIs prefer allocate-and-copy semantics; expose destructive in-place variants only under distinct, well-documented names.',
      ],
      walkthrough: [
        {
          title: 'Allocate backing array',
          caption:
            'make builds a 5-element backing array but exposes only a length-3 slice header, leaving indices 3 and 4 as spare capacity.',
          focus: ['base := make([]int, 3, 5)'],
          state: [
            {
              k: 'base',
              v: '[0 0 0]',
            },
            {
              k: 'len(base)',
              v: '3',
            },
            {
              k: 'cap(base)',
              v: '5',
            },
            {
              k: 'backing',
              v: '[0 0 0 _ _]',
            },
          ],
        },
        {
          title: 'Fill base values',
          caption:
            'The three visible slots are written, so the shared backing array now holds 1, 2, 3 in its first three positions.',
          focus: ['base[0], base[1], base[2] = 1, 2, 3'],
          state: [
            {
              k: 'base',
              v: '[1 2 3]',
            },
            {
              k: 'backing',
              v: '[1 2 3 _ _]',
            },
          ],
        },
        {
          title: 'Create aliasing view',
          caption:
            'view is a new header pointing at the SAME backing array, spanning only the first two elements but inheriting the remaining capacity.',
          focus: ['view := base[0:2]'],
          state: [
            {
              k: 'view',
              v: '[1 2]',
            },
            {
              k: 'len(view)',
              v: '2',
            },
            {
              k: 'cap(view)',
              v: '5',
            },
            {
              k: 'aliases',
              v: 'base backing',
            },
          ],
        },
        {
          title: 'append clobbers in place',
          caption:
            'Because cap(view)>len(view), append reuses the backing array and writes 99 into slot index 2 — the very element base[2] still points at.',
          focus: ['view = append(view, 99)'],
          state: [
            {
              k: 'view',
              v: '[1 2 99]',
            },
            {
              k: 'base',
              v: '[1 2 99]',
            },
            {
              k: 'backing',
              v: '[1 2 99 _ _]',
            },
            {
              k: 'reallocated?',
              v: 'no',
            },
          ],
        },
        {
          title: 'Detach via copy',
          caption:
            'make plus copy produces detached with its own independent backing array, so mutating detached[0] to -1 leaves base untouched.',
          focus: ['copy(detached, base)', 'detached[0] = -1'],
          state: [
            {
              k: 'detached',
              v: '[-1 2 99]',
            },
            {
              k: 'base',
              v: '[1 2 99]',
            },
            {
              k: 'backing',
              v: 'separate',
            },
          ],
        },
        {
          title: 'Full-slice expression caps',
          caption:
            'base[0:2:2] sets cap==len, so the next append has no spare room and must allocate a fresh backing array instead of clobbering base.',
          focus: ['safe := base[0:2:2]', 'safe = append(safe, 7)'],
          state: [
            {
              k: 'cap(safe)',
              v: '2 (before append)',
            },
            {
              k: 'safe',
              v: '[1 2 7]',
            },
            {
              k: 'base',
              v: '[1 2 99]',
            },
            {
              k: 'reallocated?',
              v: 'yes',
            },
          ],
        },
        {
          title: 'nil vs empty slice',
          caption:
            'A nil slice and an empty literal both have len 0 and are range-safe, but only the nil one compares equal to nil because it carries no backing pointer.',
          focus: ['var nilSlice []int', 'emptySlice := []int{}'],
          state: [
            {
              k: 'nilSlice==nil',
              v: 'true',
            },
            {
              k: 'emptySlice==nil',
              v: 'false',
            },
            {
              k: 'len both',
              v: '0',
            },
          ],
        },
      ],
    },
    {
      id: 'go-data-maps',
      title: 'Map internals & iteration order',
      difficulty: 'Hard',
      tags: ['maps', 'runtime', 'iteration', 'hashing', 'addressability'],
      summary:
        'How Go maps hash, grow, and iterate, plus the addressability and nil-map rules that trip up seniors.',
      pattern: 'Map internals',
      visual:
        'Buckets hold 8 slots; overflow chains plus incremental growth; range starts at a random bucket and slot.',
      memorize:
        'Random range start, no &m[k], nil read ok / nil write panics, delete-in-range safe, grow at ~6.5 load.',
      scene:
        'Picture a hash-table casino: every range spins a wheel to pick which bucket you visit first, and you can never pocket a chip (take an address) that is glued to the table.',
      time: 'O(1) avg lookup',
      space: 'O(n)',
      code: 'package main\n\nimport "fmt"\n\ntype Counter struct {\n\tHits int\n}\n\nfunc main() {\n\tm := map[string]*Counter{\n\t\t"a": {Hits: 1},\n\t\t"b": {Hits: 3},\n\t}\n\n\t// Values are pointers, so we can mutate through them.\n\t// We could NOT take &m["a"] if the value were a struct,\n\t// because map elements are not addressable.\n\tm["a"].Hits++\n\n\t// Deleting during range is well-defined: a key deleted\n\t// before it is reached will not be produced by the range.\n\tfor k, v := range m {\n\t\tif v.Hits > 2 {\n\t\t\tdelete(m, k)\n\t\t}\n\t}\n\n\t// Reading a missing key (even from a nil map) returns the\n\t// zero value and never panics.\n\tvar nilMap map[string]int\n\tfmt.Println("nil read:", nilMap["missing"])\n\n\t// Iteration order is randomized per range; sort keys if you\n\t// need determinism.\n\ttotal := 0\n\tfor _, v := range m {\n\t\ttotal += v.Hits\n\t}\n\tfmt.Println("total:", total)\n}\n',
      keyPoints: [
        "Nil map: reads, len, and delete behave as an empty map; any write panics with 'assignment to entry in nil map'.",
        'Iteration order is randomized per range by design to prevent hidden order dependence; insertion order is never preserved.',
        'Map elements are not addressable, so you cannot take &m[k] or assign to a field of a struct value in place; use pointer values or read-modify-write.',
        'delete during range is safe and skips keys removed before they are reached; whether inserts appear is unspecified.',
        'In the traditional bucket implementation, growth triggers around load factor ~6.5 per bucket or on excessive overflow buckets (same-size growth); a full bucket alone just adds an overflow bucket.',
        "Unsynchronized concurrent access can trigger an unrecoverable runtime fatal ('concurrent map writes'), not a catchable panic; use a mutex or sync.Map.",
      ],
      walkthrough: [
        {
          title: 'Build the map',
          caption:
            'A map from string to *Counter is created with two entries; each value is a pointer to a heap-allocated Counter.',
          focus: ['m := map[string]*Counter{', '"b": {Hits: 3},'],
          state: [
            {
              k: 'm["a"].Hits',
              v: '1',
            },
            {
              k: 'm["b"].Hits',
              v: '3',
            },
            {
              k: 'len(m)',
              v: '2',
            },
          ],
        },
        {
          title: 'Mutate through pointer',
          caption:
            'm["a"] returns the pointer value, and .Hits++ mutates the pointed-to Counter in place — legal because we never take the address of the map element itself.',
          focus: ['m["a"].Hits++'],
          state: [
            {
              k: 'm["a"].Hits',
              v: '2',
            },
            {
              k: 'm["b"].Hits',
              v: '3',
            },
          ],
        },
        {
          title: 'Addressability rule',
          caption:
            'You may call a method or access a field on m[k], but &m[k] is a compile error because map elements are not addressable (the backing slot can move when the map grows).',
          focus: ['because map elements are not addressable.'],
          state: [
            {
              k: '&m["a"]',
              v: 'compile error',
            },
            {
              k: 'm["a"].Hits++',
              v: 'ok (ptr value)',
            },
          ],
        },
        {
          title: 'Range in random order',
          caption:
            'The range begins at a randomized bucket and offset chosen per-loop, so key visitation order is nondeterministic across runs.',
          focus: ['for k, v := range m {'],
          state: [
            {
              k: 'iteration order',
              v: 'randomized',
            },
            {
              k: 'len(m)',
              v: '2',
            },
          ],
        },
        {
          title: 'Delete during range',
          caption:
            'When a visited entry has Hits > 2 it is deleted mid-iteration; deleting the current or a not-yet-reached key during range is well-defined and safe.',
          focus: ['if v.Hits > 2 {', 'delete(m, k)'],
          state: [
            {
              k: 'deletes "b"',
              v: 'Hits 3 > 2',
            },
            {
              k: '"a" kept',
              v: 'Hits 2',
            },
            {
              k: 'len(m) after',
              v: '1',
            },
          ],
        },
        {
          title: 'Read from nil map',
          caption:
            'nilMap is a nil map; indexing a missing key on it returns the int zero value 0 and never panics (only writes to a nil map panic).',
          focus: ['var nilMap map[string]int', 'nilMap["missing"]'],
          state: [
            {
              k: 'nilMap',
              v: 'nil',
            },
            {
              k: 'nilMap["missing"]',
              v: '0',
            },
            {
              k: 'prints',
              v: 'nil read: 0',
            },
          ],
        },
        {
          title: 'Sum remaining values',
          caption:
            'A fresh range (again randomized) walks the surviving entry; only "a" remains, so total accumulates its Hits value of 2.',
          focus: ['for _, v := range m {', 'total += v.Hits'],
          state: [
            {
              k: 'len(m)',
              v: '1',
            },
            {
              k: 'total',
              v: '2',
            },
          ],
        },
        {
          title: 'Print total',
          caption:
            'The final total 2 is printed, reflecting the mutated "a" entry after "b" was deleted during iteration.',
          focus: ['fmt.Println("total:", total)'],
          state: [
            {
              k: 'total',
              v: '2',
            },
            {
              k: 'prints',
              v: 'total: 2',
            },
          ],
        },
      ],
    },
    {
      id: 'go-data-strings-runes',
      title: 'Strings, bytes, runes & UTF-8',
      difficulty: 'Hard',
      tags: ['strings', 'runes', 'utf8', 'bytes', 'encoding'],
      summary: 'Strings are immutable byte sequences; indexing yields bytes, range yields runes.',
      pattern: 'Strings & runes',
      visual: 'string header = {*byte, len}; s[i] reads one byte; range decodes UTF-8 into runes.',
      memorize: 'len=bytes, index=byte, range=rune; []byte/[]rune copy, string()/[]byte() may not.',
      scene:
        "A transparent ruler laid over '世界': the ruler ticks in bytes, but each glyph swallows three ticks at once.",
      time: 'O(n) decode',
      space: 'O(n) for []byte/[]rune conversion',
      code: 'package main\n\nimport (\n\t"fmt"\n\t"unicode/utf8"\n)\n\nfunc main() {\n\ts := "héllo, 世界"\n\n\tfmt.Println("len(s) =", len(s))\n\tfmt.Println("RuneCountInString =", utf8.RuneCountInString(s))\n\n\tfmt.Printf("s[1] = %d (byte, not rune)\\n", s[1])\n\n\tfor i, r := range s {\n\t\tfmt.Printf("byte %d: %c U+%04X width=%d\\n", i, r, r, utf8.RuneLen(r))\n\t}\n\n\tb := []byte(s)\n\tb[0] = \'H\'\n\tfmt.Println("mutated copy:", string(b), "| original:", s)\n\n\trs := []rune(s)\n\tfmt.Println("rune count via slice:", len(rs), "| first rune:", string(rs[0]))\n}\n',
      keyPoints: [
        'len(s) is byte length; utf8.RuneCountInString gives code-point count.',
        'Indexing s[i] yields a byte; range yields (byte-offset, rune) via UTF-8 decode.',
        'range over a string decodes lazily and emits U+FFFD, advancing one byte, on invalid UTF-8.',
        '[]byte(s) and []rune(s) both copy because strings are immutable; []rune also decodes to int32.',
        'Compiler elides some string([]byte) allocations (map key, range) but not []byte(string).',
        'Slice strings on rune boundaries with utf8 helpers, not arbitrary byte offsets.',
      ],
      walkthrough: [
        {
          title: 'Declare the string',
          caption:
            's is bound to a UTF-8 encoded string literal holding 9 characters that occupy 14 bytes.',
          focus: ['s := "héllo, 世界"'],
          state: [
            {
              k: 's',
              v: 'héllo, 世界',
            },
            {
              k: 'type',
              v: 'string (immutable)',
            },
          ],
        },
        {
          title: 'len is bytes',
          caption:
            'len(s) returns the number of bytes in the encoding — 14 — because é is 2 bytes and 世/界 are 3 bytes each.',
          focus: ['len(s)'],
          state: [
            {
              k: 'len(s)',
              v: '14',
            },
            {
              k: 'h/é/l/l/o/,/·',
              v: '1+2+1+1+1+1+1',
            },
            {
              k: '世/界',
              v: '3+3',
            },
          ],
        },
        {
          title: 'Count actual runes',
          caption:
            'utf8.RuneCountInString decodes the bytes and reports 9 — the true number of Unicode code points, not bytes.',
          focus: ['utf8.RuneCountInString(s)'],
          state: [
            {
              k: 'RuneCount',
              v: '9',
            },
            {
              k: 'len(s)',
              v: '14',
            },
            {
              k: 'len != runes',
              v: 'true',
            },
          ],
        },
        {
          title: 'Indexing yields a byte',
          caption:
            's[1] reads a single byte (195, the 0xC3 lead byte of é), NOT the rune é — indexing a string is always byte-addressed.',
          focus: ['s[1] = %d (byte, not rune)'],
          state: [
            {
              k: 's[1]',
              v: '195 (0xC3)',
            },
            {
              k: 'is é?',
              v: 'no — lead byte only',
            },
            {
              k: 'type of s[1]',
              v: 'byte',
            },
          ],
        },
        {
          title: 'range decodes runes',
          caption:
            'range over a string decodes UTF-8 on the fly, giving the starting byte index i and the decoded rune r for each code point.',
          focus: ['for i, r := range s'],
          state: [
            {
              k: 'i (byte index)',
              v: '0,1,3,4,5,6,7,8,11',
            },
            {
              k: 'i jumps',
              v: '1→3 (é), 8→11 (世)',
            },
            {
              k: 'r',
              v: 'rune (int32)',
            },
          ],
        },
        {
          title: 'Gotcha: index != rune order',
          caption:
            'The index i is a byte offset, so it skips ahead by the encoded width (RuneLen): é occupies bytes 1-2, 世 occupies 8-10, hence 界 starts at 11.',
          focus: ['utf8.RuneLen(r)'],
          state: [
            {
              k: 'é width',
              v: '2',
            },
            {
              k: '世/界 width',
              v: '3',
            },
            {
              k: '世 at index',
              v: '8',
            },
            {
              k: '界 at index',
              v: '11',
            },
          ],
        },
        {
          title: '[]byte copies, then mutate',
          caption:
            "[]byte(s) allocates a fresh mutable copy of the bytes, so b[0]='H' changes the copy while the original immutable string s is untouched.",
          focus: ['b := []byte(s)', "b[0] = 'H'"],
          state: [
            {
              k: 'b (copy)',
              v: 'Héllo, 世界',
            },
            {
              k: 's (original)',
              v: 'héllo, 世界',
            },
            {
              k: 'aliased?',
              v: 'no — copied',
            },
          ],
        },
        {
          title: '[]rune gives code points',
          caption:
            "[]rune(s) decodes into a slice of 9 runes, so len(rs) equals the rune count and rs[0] is the first whole code point 'h', printed via string().",
          focus: ['rs := []rune(s)', 'string(rs[0])'],
          state: [
            {
              k: 'len(rs)',
              v: '9',
            },
            {
              k: 'rs[0]',
              v: "'h' (U+0068)",
            },
            {
              k: 'len(rs) == RuneCount',
              v: 'true',
            },
          ],
        },
      ],
    },
  ],
};
