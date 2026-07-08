import type { GoTopic } from '../types';

export const collections: GoTopic = {
  id: 'collections',
  title: 'Slices, Maps & Arrays',
  icon: 'Layers',
  concepts: [
    {
      id: 'go-coll-arrays',
      title: 'Arrays: fixed length is part of the type; value semantics',
      difficulty: 'Easy',
      tags: ['arrays', 'value-semantics', 'types'],
      summary:
        'An array’s length is baked into its type, and assigning or passing one copies every element.',
      pattern: 'Value array',
      visual: '[3]int and [4]int are different types; assignment duplicates the whole array.',
      memorize: 'Length is in the type. Copy = full copy. Pass by pointer to mutate.',
      scene:
        'An array is a numbered egg carton whose slot count is stamped on the box — hand someone the carton and they get a fresh cloned carton, not yours.',
      time: 'O(n) copy',
      space: 'O(n)',
      code: 'package main\n\nimport "fmt"\n\nfunc bump(a [3]int) {\n\ta[0] = 99\n}\n\nfunc main() {\n\tx := [3]int{1, 2, 3}\n\ty := x\n\ty[0] = 42\n\n\tbump(x)\n\n\tfmt.Println(x)\n\tfmt.Println(y)\n\tfmt.Println(len(x))\n}\n',
      keyPoints: [
        'The length is part of the type: [3]int and [4]int are distinct, incompatible types.',
        'Arrays have value semantics — y := x copies all elements, and passing to a func copies too, so bump cannot mutate the caller’s array.',
        'Use [...]int{1,2,3} to let the compiler count the elements, or pass *[3]int / a slice when you need in-place mutation.',
      ],
      walkthrough: [
        {
          title: 'Declare and copy',
          caption: 'y := x copies every element, so y is an independent array — not an alias.',
          focus: ['y := x'],
          state: [
            { k: 'x', v: '[1 2 3]' },
            { k: 'y', v: '[1 2 3]' },
          ],
        },
        {
          title: 'Mutate the copy',
          caption: 'Writing y[0] touches only y; x is untouched because they are separate values.',
          focus: ['y[0] = 42'],
          state: [
            { k: 'y', v: '[42 2 3]' },
            { k: 'x', v: '[1 2 3]' },
          ],
        },
        {
          title: 'Pass by value',
          caption: 'bump receives a copy of x, so its write to a[0] is lost when the call returns.',
          focus: ['func bump(a [3]int) {'],
          state: [{ k: 'x after bump', v: '[1 2 3]' }],
        },
        {
          title: 'Observe output',
          caption:
            'Both x and y print their own contents; len is a compile-time constant from the type.',
          focus: ['fmt.Println(len(x))'],
          state: [{ k: 'output', v: '[1 2 3] / [42 2 3] / 3' }],
        },
      ],
    },
    {
      id: 'go-coll-slices',
      title: 'Slices: make, len, cap, append growth',
      difficulty: 'Easy',
      tags: ['slices', 'append', 'make', 'capacity'],
      summary:
        'A slice is a header (ptr, len, cap) over an array that append grows — reallocating when cap runs out.',
      pattern: 'Slice growth',
      visual: 'append fills up to cap in place, then allocates a bigger backing array and copies.',
      memorize: 'Slice = {ptr, len, cap}. append past cap reallocates. Always s = append(s, ...).',
      scene:
        'A slice is a bookmarked window onto a shelf; append writes into empty shelf slots until the shelf is full, then buys a bigger shelf and moves the books.',
      time: 'O(1) amortized append',
      space: 'O(n)',
      code: 'package main\n\nimport "fmt"\n\nfunc main() {\n\ts := make([]int, 0, 2)\n\tfmt.Println(len(s), cap(s))\n\n\ts = append(s, 1, 2)\n\tfmt.Println(len(s), cap(s))\n\n\ts = append(s, 3)\n\tfmt.Println(len(s), cap(s))\n\tfmt.Println(s)\n}\n',
      keyPoints: [
        'A slice header carries a pointer, a length, and a capacity; len is the usable count and cap is how far it can grow before reallocating.',
        'append writes into spare capacity in place, but once len would exceed cap it allocates a NEW backing array and copies — which is why you must reassign s = append(s, ...).',
        'Growth is amortized O(1): small slices roughly double, so the printed cap jumps from 2 to 4 when the third element is appended.',
      ],
      walkthrough: [
        {
          title: 'Preallocate',
          caption: 'make([]int, 0, 2) gives an empty slice (len 0) with room for 2 (cap 2).',
          focus: ['s := make([]int, 0, 2)'],
          state: [{ k: 'len/cap', v: '0 2' }],
        },
        {
          title: 'Fill the capacity',
          caption: 'Appending 1 and 2 fits inside the existing cap, so no reallocation happens.',
          focus: ['s = append(s, 1, 2)'],
          state: [{ k: 'len/cap', v: '2 2' }],
        },
        {
          title: 'Grow past cap',
          caption:
            'The third append exceeds cap 2, so Go allocates a larger array; cap grows to 4.',
          focus: ['s = append(s, 3)'],
          state: [{ k: 'len/cap', v: '3 4' }],
        },
        {
          title: 'Final contents',
          caption: 'The reassigned slice holds all three elements on its new backing array.',
          focus: ['fmt.Println(s)'],
          state: [{ k: 'output', v: '0 2 / 2 2 / 3 4 / [1 2 3]' }],
        },
      ],
    },
    {
      id: 'go-coll-slice-aliasing',
      title: 'Slices share a backing array; copy() and full three-index slices',
      difficulty: 'Medium',
      tags: ['slices', 'aliasing', 'copy', 'three-index'],
      summary:
        'Sub-slices alias the same backing array, so writes bleed across — copy() or a capped s[a:b:c] isolate them.',
      pattern: 'Backing array',
      visual:
        'b := a[1:3] points into a’s array; b[0]=... mutates a. Three-index caps cap to force realloc.',
      memorize:
        'Sub-slices alias. copy() detaches. a[low:high:max] caps cap so append reallocates.',
      scene:
        'Two bookmarks on one shelf: scribble on the page one bookmark shows and the other sees it too, unless you photocopy the pages (copy) or fence off the shelf (three-index).',
      time: 'O(n) copy',
      space: 'O(n)',
      code: 'package main\n\nimport "fmt"\n\nfunc main() {\n\ta := []int{1, 2, 3, 4}\n\tb := a[1:3]\n\tb[0] = 99\n\tfmt.Println(a)\n\n\tc := make([]int, len(b))\n\tcopy(c, b)\n\tc[0] = 0\n\tfmt.Println(b, c)\n\n\td := a[0:2:2]\n\td = append(d, 7)\n\tfmt.Println(a, cap(d))\n}\n',
      keyPoints: [
        'Slicing does NOT copy — b := a[1:3] shares a’s backing array, so b[0] = 99 overwrites a[1]: the classic aliasing gotcha.',
        'copy(dst, src) makes an independent slice; afterward mutating c leaves b (and a) untouched.',
        'A full three-index slice a[low:high:max] sets cap to max-low, so appending forces a fresh allocation instead of clobbering later elements of a.',
      ],
      walkthrough: [
        {
          title: 'Alias via slicing',
          caption: 'b views a[1:3] over the same array; b[0] = 99 is really a write to a[1].',
          focus: ['b := a[1:3]', 'b[0] = 99'],
          state: [{ k: 'a', v: '[1 99 3 4]' }],
        },
        {
          title: 'Detach with copy',
          caption:
            'copy(c, b) duplicates b’s elements into a new array, so c[0] = 0 does not affect b.',
          focus: ['copy(c, b)'],
          state: [
            { k: 'b', v: '[99 3]' },
            { k: 'c', v: '[0 3]' },
          ],
        },
        {
          title: 'Cap with three-index',
          caption: 'd := a[0:2:2] has len 2 and cap 2, so its append cannot overwrite a[2].',
          focus: ['d := a[0:2:2]'],
          state: [{ k: 'cap(d)', v: '2' }],
        },
        {
          title: 'Append reallocates',
          caption:
            'Appending 7 exceeds d’s cap of 2, allocating a new array and leaving a unchanged.',
          focus: ['d = append(d, 7)'],
          state: [
            { k: 'a', v: '[1 99 3 4]' },
            { k: 'cap(d)', v: '4' },
          ],
        },
      ],
    },
    {
      id: 'go-coll-maps',
      title: 'Maps: comma-ok, delete, random iteration, nil-map write panic',
      difficulty: 'Easy',
      tags: ['maps', 'comma-ok', 'delete', 'nil'],
      summary:
        'Maps distinguish missing from zero via comma-ok, iterate in random order, and panic on writes to a nil map.',
      pattern: 'Map lookup',
      visual:
        'v, ok := m[k] tells present vs zero; delete(m, k) removes; a nil map reads fine but writes panic.',
      memorize: 'comma-ok = present vs zero. Range order random. Nil map: read ok, write PANIC.',
      scene:
        'A coat-check where an empty ticket looks identical to a zero-value coat — the ok flag is the attendant telling you whether a coat was ever checked in.',
      time: 'O(1) average',
      space: 'O(n)',
      code: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tm := map[string]int{"a": 1}\n\n\tv, ok := m["a"]\n\tfmt.Println(v, ok)\n\n\tz, ok := m["x"]\n\tfmt.Println(z, ok)\n\n\tm["b"] = 2\n\tdelete(m, "a")\n\tfmt.Println(len(m))\n\n\tvar n map[string]int\n\tfmt.Println(n["missing"])\n}\n',
      keyPoints: [
        'The comma-ok form v, ok := m[k] separates “absent” from “present but zero” — without ok, a missing key silently returns the value type’s zero value.',
        'Iteration order over a map is deliberately randomized each run, so never rely on range order; sort the keys if you need determinism.',
        'A nil map reads fine (returning zero), but writing to one panics with “assignment to entry in nil map” — always make() a map before assigning.',
      ],
      walkthrough: [
        {
          title: 'Present key',
          caption: 'Looking up an existing key returns its value and ok = true.',
          focus: ['v, ok := m["a"]'],
          state: [{ k: 'v, ok', v: '1 true' }],
        },
        {
          title: 'Missing key',
          caption:
            'A missing key yields the zero value (0) and ok = false — the reason comma-ok exists.',
          focus: ['z, ok := m["x"]'],
          state: [{ k: 'z, ok', v: '0 false' }],
        },
        {
          title: 'Insert and delete',
          caption: 'Assigning m["b"] adds a key and delete(m, "a") removes one, leaving one entry.',
          focus: ['delete(m, "a")'],
          state: [{ k: 'len(m)', v: '1' }],
        },
        {
          title: 'Nil map read',
          caption:
            'Reading from a nil map is safe and returns the zero value; a write here would panic instead.',
          focus: ['var n map[string]int'],
          state: [
            { k: 'n["missing"]', v: '0' },
            { k: 'output', v: '1 true / 0 false / 1 / 0' },
          ],
        },
      ],
    },
    {
      id: 'go-coll-range',
      title: 'range over slices, maps, strings, and ints (1.22)',
      difficulty: 'Easy',
      tags: ['range', 'strings', 'runes', 'loops'],
      summary:
        'range yields index/value pairs over slices and maps, decodes runes over strings, and counts 0..n-1 over an int.',
      pattern: 'range forms',
      visual: 'Slice: i, v. Map: k, v. String: byte-index, rune. Int (1.22): i from 0 to n-1.',
      memorize:
        'String range = rune + byte offset. range n (1.22) counts 0..n-1. range copies values.',
      scene:
        'range is a universal turnstile: over a string it clicks per character (rune) but reports the byte gate number, and since 1.22 you can spin it n times with just range n.',
      time: 'O(n)',
      space: 'O(1)',
      code: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfor i, v := range []string{"a", "b"} {\n\t\tfmt.Println(i, v)\n\t}\n\n\tfor i, r := range "hé" {\n\t\tfmt.Println(i, r)\n\t}\n\n\ttotal := 0\n\tfor i := range 3 {\n\t\ttotal += i\n\t}\n\tfmt.Println(total)\n}\n',
      keyPoints: [
        'Ranging a string yields the starting BYTE index and a rune (decoded UTF-8), so a multi-byte rune like é makes the next index jump by more than one.',
        'Since Go 1.22, range over an integer n iterates i from 0 to n-1, replacing the classic C-style counting loop.',
        'range hands you a COPY of each value; also since 1.22 the loop variable is fresh per iteration, so closures capturing it no longer share one variable.',
      ],
      walkthrough: [
        {
          title: 'Range a slice',
          caption: 'Over a slice, range yields the index and a copy of each element.',
          focus: ['for i, v := range []string{"a", "b"} {'],
          state: [{ k: 'output', v: '0 a / 1 b' }],
        },
        {
          title: 'Range a string',
          caption:
            'Over a string, range decodes runes and reports each rune’s starting byte offset.',
          focus: ['for i, r := range "hé" {'],
          state: [{ k: 'i, r', v: '0 104 / 1 233' }],
        },
        {
          title: 'Range an int (1.22)',
          caption: 'range 3 iterates i = 0, 1, 2, summing to 3.',
          focus: ['for i := range 3 {'],
          state: [{ k: 'total', v: '3' }],
        },
        {
          title: 'Full output',
          caption: 'The three loops print their values in order, ending with the int-range sum.',
          focus: ['fmt.Println(total)'],
          state: [{ k: 'output', v: '0 a / 1 b / 0 104 / 1 233 / 3' }],
        },
      ],
    },
    {
      id: 'go-coll-grouping',
      title: 'Nested slices and the map[K][]V grouping pattern',
      difficulty: 'Medium',
      tags: ['maps', 'slices', 'grouping', 'idioms'],
      summary:
        'map[K][]V groups items by key by appending to the nil slice that a missing key returns.',
      pattern: 'map[K][]V',
      visual:
        'g[key] = append(g[key], v): a missing key yields nil, and append to nil just starts a new slice.',
      memorize:
        'Group = map[K][]V. append(g[k], v) works because missing key -> nil slice, append(nil,...) is fine.',
      scene:
        'A wall of labeled mail slots: hand a letter to a slot that does not exist yet and the mailroom conjures an empty slot on the spot, then drops your letter in.',
      time: 'O(n)',
      space: 'O(n)',
      code: 'package main\n\nimport (\n\t"fmt"\n\t"sort"\n)\n\nfunc main() {\n\twords := []string{"ant", "bee", "art", "bug"}\n\tgroups := map[byte][]string{}\n\n\tfor _, w := range words {\n\t\tk := w[0]\n\t\tgroups[k] = append(groups[k], w)\n\t}\n\n\tkeys := []byte{}\n\tfor k := range groups {\n\t\tkeys = append(keys, k)\n\t}\n\tsort.Slice(keys, func(i, j int) bool { return keys[i] < keys[j] })\n\n\tfor _, k := range keys {\n\t\tfmt.Printf("%c: %v\\n", k, groups[k])\n\t}\n}\n',
      keyPoints: [
        'The grouping idiom relies on a map miss returning the value type’s zero — here a nil []string — and append(nilSlice, x) happily allocates a new slice, so no pre-check or make() is needed.',
        'groups[k] = append(groups[k], w) reads the current (possibly nil) slice, appends, and stores the result back — you must reassign because append may return a new header.',
        'Map iteration is randomized, so collect and sort.Slice the keys before printing when you need deterministic, ordered output.',
      ],
      walkthrough: [
        {
          title: 'Empty group map',
          caption: 'groups starts empty; every key currently maps to a nil []string.',
          focus: ['groups := map[byte][]string{}'],
          state: [{ k: 'groups', v: '{}' }],
        },
        {
          title: 'Append per key',
          caption:
            'For each word, append to groups[k]; a missing key yields nil, and append seeds a new slice.',
          focus: ['groups[k] = append(groups[k], w)'],
          state: [
            { k: "groups['a']", v: '[ant art]' },
            { k: "groups['b']", v: '[bee bug]' },
          ],
        },
        {
          title: 'Sort the keys',
          caption:
            'Because map order is random, collect keys and sort them for deterministic output.',
          focus: ['sort.Slice(keys, func(i, j int) bool { return keys[i] < keys[j] })'],
          state: [{ k: 'keys', v: '[a b]' }],
        },
        {
          title: 'Print grouped',
          caption: 'Iterating the sorted keys prints each bucket in a stable order.',
          focus: ['fmt.Printf("%c: %v\\n", k, groups[k])'],
          state: [{ k: 'output', v: 'a: [ant art] / b: [bee bug]' }],
        },
      ],
    },
  ],
};
