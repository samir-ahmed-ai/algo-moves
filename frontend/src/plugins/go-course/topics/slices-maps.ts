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
      quiz: [
        {
          id: 'three-index-cap',
          prompt:
            'Given `b := make([]int, 5, 8)` and `v := b[1:3:4]`, what are `len(v)` and `cap(v)`?',
          choices: [
            {
              label: 'len 2, cap 3 — high minus low, then max minus low',
              correct: true,
            },
            {
              label: 'len 2, cap 7 — parent cap 8 minus low, ignoring max',
            },
            {
              label: 'len 2, cap 4 — max index used directly as cap',
            },
            {
              label: 'len 4, cap 4 — three-index sets len from max',
            },
          ],
          explain:
            "For `b[low:high:max]`, len = high-low = 3-1 = 2 and cap = max-low = 4-1 = 3. The third index bounds cap without touching len; the parent's own cap of 8 is irrelevant once max is supplied.",
        },
        {
          id: 'append-alias',
          prompt:
            'After `v := b[1:3:4]` on `b := []int{0,1,2,3,4}` (cap 5), then `v = append(v, 99)`, what is `b`?',
          choices: [
            {
              label: '[0 1 2 99 4] — in-cap append overwrites b[3]',
              correct: true,
            },
            {
              label: '[0 1 2 3 4] — append never mutates the parent',
            },
            {
              label: '[0 1 99 3 4] — append writes at the slice start',
            },
            {
              label: 'panic — append exceeds the capped slice',
            },
          ],
          explain:
            'v has len 2, cap 3, so one append stays within cap and writes into the shared backing at index 3 (b[3]), overwriting the 3 with 99. No reallocation occurs.',
        },
        {
          id: 'realloc-detach',
          prompt: 'Continuing, v now has len 3, cap 3. What does the next `append(v, 100)` do?',
          choices: [
            {
              label: 'reallocates — v detaches from the backing array',
              correct: true,
            },
            {
              label: 'grows in place — b silently extends to hold 100',
            },
            {
              label: "reuses b — cap raised to parent's original 5",
            },
            {
              label: 'panics — cap 3 cannot be exceeded',
            },
          ],
          explain:
            'len==cap==3, so append allocates a new backing array, copies the elements, and appends 100. From then on v points elsewhere; mutating v no longer affects b.',
        },
        {
          id: 'growth-factor',
          prompt:
            'For appending 2048 ints one at a time to a nil slice in Go 1.26, which statement about growth is correct?',
          choices: [
            {
              label: 'amortized O(1) — cap grows geometrically not by one',
              correct: true,
            },
            {
              label: 'exactly doubling — cap is 2x at every size range',
            },
            {
              label: 'grows by one — a copy happens on each append',
            },
            {
              label: 'fixed 1024 chunks — runtime preallocates page blocks',
            },
          ],
          explain:
            'Go grows capacity geometrically (roughly doubling below 256 elements, then tapering toward ~1.25x for large slices), giving amortized O(1) appends. It is neither strict doubling across all sizes nor per-element growth.',
        },
        {
          id: 'header-copy',
          prompt:
            '`a := []int{1,2,3}; b := a; b = append(b, 4)` where a has cap 3. Which is true about a and b afterward?',
          choices: [
            {
              label: 'independent — b reallocated leaving a unchanged',
              correct: true,
            },
            {
              label: 'aliased — a[?]=4 shows the append through a',
            },
            {
              label: 'shared — a now also has len 4',
            },
            {
              label: 'panic — appending to a copied header is illegal',
            },
          ],
          explain:
            'b := a copies the header (same ptr/len/cap). Since len==cap==3, append reallocates b onto a new array; a still sees {1,2,3} with len 3. The copies diverged at the reallocation, and a has no fourth slot to reveal 4.',
        },
        {
          id: 'passing-slice',
          prompt:
            'A function `func f(s []int) { s = append(s, 9) }` is called as `f(x)` where `len(x) < cap(x)`. What does the caller observe in x?',
          choices: [
            {
              label: "len unchanged — but x's spare slot may be overwritten",
              correct: true,
            },
            {
              label: "len grows — append updates the caller's length",
            },
            {
              label: 'nothing changes — pass-by-value fully isolates s',
            },
            {
              label: 'panic — mutating a parameter slice is disallowed',
            },
          ],
          explain:
            "The header is passed by value, so the caller's len is unaffected. But because cap>len, append writes 9 into the shared backing array at index len(x), so that spare element is mutated even though x's length stays the same.",
        },
      ],
      design: {
        prompt:
          'You maintain a library that parses a large byte buffer and returns many small sub-slices of it to callers (e.g. tokens, header fields). Some callers retain these sub-slices for a long time; some also append to them. What are the aliasing and memory-retention hazards, and how would you design the API to be safe and efficient?',
        answer:
          "The core hazards are backing-array retention and accidental aliasing. Returning `buf[i:j]` keeps the entire multi-megabyte `buf` alive as long as any tiny sub-slice is reachable, because the GC tracks the whole backing array, not the viewed window — a classic memory leak. Aliasing is the second trap: two sub-slices of the same buffer can have overlapping capacities, so a caller's `append` that stays within cap can silently corrupt a neighboring slice's data or the un-parsed tail of the buffer. The mitigations trade memory for safety. To bound retention, `copy` each returned slice into a fresh right-sized array (or use `bytes.Clone`), which detaches it from `buf` at the cost of an allocation and copy per token. To make append safe without forcing copies everywhere, return three-index slices `buf[i:j:j]` so cap==len; any caller append is then guaranteed to reallocate rather than clobber the shared buffer. My recommendation: default to returning `buf[i:j:j]` (cheap, prevents append aliasing) and document that callers who retain slices beyond the buffer's lifetime must clone; additionally offer an explicit `CloneToken` helper or a `copy=true` option for the retention-heavy path. This keeps the hot path allocation-free while giving long-lived consumers a clear, correct escape hatch, and it avoids the worst outcome — silent data corruption from unbounded cap sharing.",
      },
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
      quiz: [
        {
          id: 'append-clobber',
          prompt:
            'Given `base := []int{1,2,3,4}` with len==cap==4, then `v := base[0:2]` followed by `v = append(v, 99)`, what is `base` afterward?',
          choices: [
            {
              label: '[1 2 99 4] — spare cap lets append write base[2]',
              correct: true,
            },
            {
              label: '[1 2 3 4] — append always reallocates',
              correct: false,
            },
            {
              label: '[1 2 99] — base is truncated by append',
              correct: false,
            },
            {
              label: 'panic — index out of range on append',
              correct: false,
            },
          ],
          explain:
            "v has len 2 but cap 4 (it inherits base's capacity from index 0), so append writes into the shared slot at index 2, overwriting the 3 with 99. base still has len 4, so the trailing 4 is unchanged: [1 2 99 4].",
        },
        {
          id: 'full-slice-detach',
          prompt:
            "To make `v := base[0:2]` such that a later `append(v, x)` can NEVER touch base's backing array (base has cap 4), which single expression is both minimal and correct?",
          choices: [
            {
              label: 'base[0:2:2] — three-index caps cap at len',
              correct: true,
            },
            {
              label: "base[0:2] — plain reslice keeps base's cap",
              correct: false,
            },
            {
              label: 'base[0:2:4] — spare cap appends in place',
              correct: false,
            },
            {
              label: 'base[:2] — omitting low index changes nothing',
              correct: false,
            },
          ],
          explain:
            'The full-slice expression base[0:2:2] sets cap==len==2, so the very next append has no spare capacity and must allocate a fresh array, guaranteeing isolation. base[0:2] and base[:2] are identical and keep cap 4; base[0:2:4] explicitly keeps cap 4, so all three let append write into base in place.',
        },
        {
          id: 'nil-vs-empty-json',
          prompt:
            'For `var a []int` (nil) and `b := []int{}` (empty), which statement is TRUE under Go 1.26 semantics?',
          choices: [
            {
              label: 'a==nil true and b==nil false — headers differ',
              correct: true,
            },
            {
              label: 'a==nil and b==nil both true — both length zero',
              correct: false,
            },
            {
              label: 'ranging over a panics — nil slice not iterable',
              correct: false,
            },
            {
              label: 'len(b) undefined — empty literal has no length',
              correct: false,
            },
          ],
          explain:
            'A nil slice compares equal to nil; an empty non-nil slice does not. Both have len 0 and range safely (a nil slice ranges zero times, no panic), but they differ in the nil comparison, and in encoding/json a nil slice marshals to null while an empty slice marshals to [].',
        },
        {
          id: 'shared-after-realloc',
          prompt:
            'After `s := make([]int, 2, 2); t := append(s, 1); t[0] = 9`, does `s[0]` change?',
          choices: [
            {
              label: "Detached now — append reallocated t's array",
              correct: true,
            },
            {
              label: 'Yes — t and s always alias one array',
              correct: false,
            },
            {
              label: 'Independent copy — append duplicated s into t',
              correct: false,
            },
            {
              label: 'Yes — writes to t[0] mirror into s[0]',
              correct: false,
            },
          ],
          explain:
            "s had cap==len==2, so append had no spare capacity and allocated a new backing array for t (copying s's elements into it). s and t are now independent, so mutating t[0] leaves s[0] untouched. The reason is reallocation, not that append avoids index 0.",
        },
        {
          id: 'copy-min-len',
          prompt:
            'What does `copy(dst, src)` do when `dst` has len 3 and `src` has len 5, and what does it return?',
          choices: [
            {
              label: 'Copies 3 — returns min(len) which is 3',
              correct: true,
            },
            {
              label: 'Copies 5 — grows dst automatically',
              correct: false,
            },
            {
              label: 'Copies 0 — length mismatch is a no-op',
              correct: false,
            },
            {
              label: 'panics — dst too small for src',
              correct: false,
            },
          ],
          explain:
            'copy never reallocates or grows the destination; it copies min(len(dst), len(src)) elements and returns that count. Here it copies 3 and returns 3.',
        },
        {
          id: 'append-two-branches',
          prompt:
            'Two slices `x` and `y` both view `base[0:2]` (cap 4). You do `x = append(x, 10)` then `y = append(y, 20)`. What is `x[2]`?',
          choices: [
            {
              label: "20 — y's append overwrote the shared slot",
              correct: true,
            },
            {
              label: '10 — x captured the slot exclusively',
              correct: false,
            },
            {
              label: '3 — the original base value survives',
              correct: false,
            },
            {
              label: 'garbage — slot reads uninitialized memory',
              correct: false,
            },
          ],
          explain:
            "Both appends have spare capacity and write into base's index 2 in place. y's append happens last, so it overwrites x's 10 with 20; since x still aliases base, x[2] reads 20.",
        },
      ],
      design: {
        prompt:
          "You maintain a widely-used Go library with a function `func Filter(in []T, pred func(T) bool) []T`. A naive implementation reuses the input's backing array (`out := in[:0]; ...; return out`) for zero allocation. What are the aliasing hazards of this approach, and how would you design the API and implementation to be both efficient and safe for callers?",
        answer:
          "Reusing the input array (in[:0] then appending kept elements) is allocation-free but mutates the caller's backing array in place: elements the caller still holds through other slices or the original header get overwritten, and the returned slice aliases the input so later appends by either side clobber the other. This violates least surprise for a public API, since callers reasonably assume Filter is non-destructive. The safe default is to allocate a fresh result (`out := make([]T, 0, len(in))`) and copy kept elements, accepting O(n) allocation for isolation; returning a nil slice when nothing is kept is idiomatic and marshals cleanly. If profiling shows the allocation is a real hot-spot, offer the in-place variant as a clearly named opt-in (e.g. FilterInPlace or a slices.DeleteFunc-style API that documents it mutates the input) and, when returning a shortened view, zero the tail slots so retained pointers can be GC'd and stale data cannot leak through the shared array. My recommendation: default to allocate-and-copy for a general-purpose library, document the aliasing contract explicitly, and expose the mutating fast-path only behind a distinct name so the destructive behavior is impossible to invoke by accident.",
      },
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
      quiz: [
        {
          id: 'nil-map-read-write',
          prompt:
            'Given `var m map[string]int` (never made with make), what happens when you first read `m["x"]` and then execute `m["x"] = 1`?',
          choices: [
            {
              label: 'Read returns 0, write panics — nil map rejects writes',
              correct: true,
            },
            {
              label: 'Both panic — nil map rejects every access',
              correct: false,
            },
            {
              label: 'Both succeed — write lazily allocates backing store',
              correct: false,
            },
            {
              label: 'Read panics, write succeeds — reads need storage',
              correct: false,
            },
          ],
          explain:
            "Reads, len, and delete on a nil map behave like an empty map: the read returns the zero value (0). Any write (assignment) to a nil map panics with 'assignment to entry in nil map'.",
        },
        {
          id: 'iteration-order',
          prompt: 'Why does Go deliberately randomize the starting point of each map range?',
          choices: [
            {
              label: 'Prevents order dependence — surfaces fragile code early',
              correct: true,
            },
            {
              label: 'Improves cache locality — random walk warms buckets',
              correct: false,
            },
            {
              label: 'Reflects hash collisions — order mirrors bucket layout',
              correct: false,
            },
            {
              label: 'Thwarts timing attacks — conceals insertion order',
              correct: false,
            },
          ],
          explain:
            'The runtime picks a random starting bucket and intra-bucket offset per range so programs cannot accidentally rely on a stable order; it is a correctness and portability safeguard, not a performance or security feature. Insertion order is never preserved regardless.',
        },
        {
          id: 'map-addressability',
          prompt:
            'With `m := map[string]Point{}` where Point is a struct, why does `m["a"].X = 5` fail to compile?',
          choices: [
            {
              label: 'Map elements not addressable — value is not assignable lvalue',
              correct: true,
            },
            {
              label: 'Missing key panics — must insert before field write',
              correct: false,
            },
            {
              label: 'Copy semantics apply — write would be silently lost',
              correct: false,
            },
            {
              label: 'Structs are immutable — Go forbids in-place field writes',
              correct: false,
            },
          ],
          explain:
            'Because rehashing and growth can relocate elements, map values are not addressable, so you cannot assign to a field of a map value in place. You must read the whole struct, modify it, and write it back, or store a pointer value type. This is a compile-time error, not a runtime one.',
        },
        {
          id: 'delete-during-range',
          prompt:
            'Which statement about mutating a map during `for k := range m` is correct under Go 1.26 semantics?',
          choices: [
            {
              label: 'delete is safe — removed-before-reached keys are skipped',
              correct: true,
            },
            {
              label: 'delete panics — mutating during range is forbidden',
              correct: false,
            },
            {
              label: 'Inserts guaranteed visible — new keys always appear later',
              correct: false,
            },
            {
              label: 'delete corrupts iterator — undefined behavior results',
              correct: false,
            },
          ],
          explain:
            'Deleting during range is explicitly allowed by the spec: a key removed before the iterator reaches it will not be produced. Adding keys during range is legal but whether a newly added entry is produced is unspecified, so it is not guaranteed either way.',
        },
        {
          id: 'load-factor-growth',
          prompt:
            "In Go's traditional bucket (pre-Swiss-table) map implementation, growth is triggered primarily when which condition holds?",
          choices: [
            {
              label: 'Load factor exceeds ~6.5 per bucket — average chain too long',
              correct: true,
            },
            {
              label: 'Any bucket reaches 8 entries — a single bucket fills',
              correct: false,
            },
            {
              label: 'Element count exceeds cap hint — grows past make size',
              correct: false,
            },
            {
              label: 'Total entries cross a power of two — resize on 2^n',
              correct: false,
            },
          ],
          explain:
            "Growth is driven by average load (element count over bucket count) crossing ~6.5 (the runtime's 13/2 load factor), or by too many overflow buckets triggering same-size growth to defragment. A single full bucket just allocates an overflow bucket rather than forcing a resize.",
        },
        {
          id: 'concurrent-access',
          prompt: 'What is the defined behavior of unsynchronized concurrent map reads and writes?',
          choices: [
            {
              label: "Runtime may fatal — 'concurrent map writes' aborts process",
              correct: true,
            },
            {
              label: 'Only a data race — output garbled, run continues',
              correct: false,
            },
            {
              label: 'Reads always safe — only writer-writer conflicts matter',
              correct: false,
            },
            {
              label: 'Last write wins — updates serialize via hidden lock',
              correct: false,
            },
          ],
          explain:
            'The runtime has lightweight concurrent-write detection that calls fatal (an unrecoverable crash, not a catchable panic) when it observes unsynchronized concurrent access. Even a concurrent read racing a write can trip it; use a mutex or sync.Map.',
        },
      ],
      design: {
        prompt:
          'You are designing an in-memory cache keyed by user ID that is read on nearly every request and written occasionally. Discuss how Go map internals (growth, addressability, iteration randomization, concurrency safety) shape your choice between a plain map with a mutex, sync.Map, or a sharded map, and recommend an approach.',
        answer:
          "The dominant constraint is that Go maps are not safe for concurrent read+write, so any shared map needs synchronization. A plain map guarded by a sync.RWMutex is the simplest and often fastest choice for read-heavy workloads because readers share the RLock and writes are rare; the RWMutex overhead is negligible next to the map lookup. sync.Map is tuned for a different profile: disjoint key sets per goroutine or write-once-read-many caches, and it avoids resizing stalls, but it boxes values in interfaces (allocations, type assertions) and is slower than a plain map under a single hot key set. For very high write concurrency, sharding into N maps each with its own mutex (keyed by hash(userID) % N) spreads lock contention and also caps the cost of any single map's incremental growth. I would recommend starting with an RWMutex-protected plain map for a read-heavy user cache, measure, and only move to sharding if lock profiling shows contention; reach for sync.Map only when the access pattern matches its niche. Regardless of choice, store pointer or immutable value types since map elements are not addressable, and never rely on iteration order for anything user-visible. Also pre-size with make(map, hint) when the cache size is roughly known to avoid repeated growth churn.",
      },
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
      quiz: [
        {
          id: 'len-vs-runecount',
          prompt:
            'For s := "héllo, 世界" (é is U+00E9 = 2 bytes; 世 and 界 are 3-byte CJK each), what do len(s) and utf8.RuneCountInString(s) return?',
          choices: [
            {
              label: '14 and 9 — bytes vs decoded runes',
              correct: true,
            },
            {
              label: '9 and 9 — len counts runes',
            },
            {
              label: '14 and 14 — both count bytes',
            },
            {
              label: '9 and 14 — len counts runes, RuneCount counts bytes',
            },
          ],
          explain:
            'len returns the byte length: h,l,l,o (4) + é (2) + comma + space (2) + 世 (3) + 界 (3) = 14. RuneCountInString decodes UTF-8 and counts 9 code points.',
        },
        {
          id: 'index-yields-byte',
          prompt:
            'Given s := "héllo" where é is 2 bytes (0xC3 0xA9), what is the type and value of s[1]?',
          choices: [
            {
              label: 'byte 0xC3 — index reads one raw byte',
              correct: true,
            },
            {
              label: "rune 'é' — indexing decodes UTF-8",
            },
            {
              label: 'rune U+00E9 — s[1] returns full code point',
            },
            {
              label: 'byte 0xA9 — index skips the lead byte',
            },
          ],
          explain:
            "Indexing a string returns a byte (uint8), never a rune. s[1] is the first byte of é's two-byte encoding, 0xC3 (the lead byte). To get runes you must range or convert to []rune.",
        },
        {
          id: 'range-index-gap',
          prompt:
            'When ranging over s := "a世b" with `for i, r := range s`, what index values does i take across the three iterations?',
          choices: [
            {
              label: '0, 1, 4 — index is the byte offset',
              correct: true,
            },
            {
              label: '0, 1, 2 — index is the rune position',
            },
            {
              label: '0, 3, 4 — first rune width added upfront',
            },
            {
              label: '1, 2, 3 — index is one-based rune count',
            },
          ],
          explain:
            "range over a string yields (byte-offset, rune). 'a' is at offset 0, '世' (3 bytes) at offset 1, and 'b' at offset 4 because the decoder advanced past 世's three bytes. Indices are byte positions, not rune ordinals.",
        },
        {
          id: 'invalid-utf8-range',
          prompt:
            'Ranging over a string containing an invalid UTF-8 byte (e.g. a lone 0xFF), what rune value does that iteration produce and how far does it advance?',
          choices: [
            {
              label: 'U+FFFD advancing 1 — replacement char per bad byte',
              correct: true,
            },
            {
              label: 'panic — range rejects invalid UTF-8',
            },
            {
              label: '0xFF as rune — raw byte promoted unchanged',
            },
            {
              label: 'U+FFFD advancing 0 — decoder loops forever',
            },
          ],
          explain:
            'range on a string treats invalid encoding leniently: each malformed byte yields RuneError (U+FFFD) and the offset advances by exactly one byte, guaranteeing progress. It never panics.',
        },
        {
          id: 'conversion-copy',
          prompt:
            'Which statement about b := []byte(s) and back string(b) under standard Go 1.26 semantics is correct?',
          choices: [
            {
              label: '[]byte(s) copies — strings immutable so mutation needs a copy',
              correct: true,
            },
            {
              label: '[]byte(s) aliases s — zero-copy shares backing array',
            },
            {
              label: 'string(b) always allocates — even inside map lookups',
            },
            {
              label: 'both are free — compiler proves no allocation ever',
            },
          ],
          explain:
            "[]byte(s) allocates and copies because the resulting slice is mutable while the string's backing bytes must stay immutable. The compiler does optimize away some string(b) allocations (e.g. m[string(b)] lookups, range over string(b)), but []byte(s) itself copies.",
        },
        {
          id: 'rune-slice-mutation',
          prompt:
            'After rs := []rune("héllo"), how does len(rs) compare to len("héllo"), and is rs mutable?',
          choices: [
            {
              label: 'len(rs)=5 mutable — []rune stores decoded code points',
              correct: true,
            },
            {
              label: 'len(rs)=6 mutable — one int32 per byte',
            },
            {
              label: 'len(rs)=5 immutable — rune slice shares string memory',
            },
            {
              label: 'len(rs)=6 immutable — includes é continuation byte',
            },
          ],
          explain:
            '[]rune decodes the UTF-8 into a fresh []int32 of code points, so len(rs)=5 (5 runes) even though the string is 6 bytes. The slice is an independent, mutable copy.',
        },
      ],
      design: {
        prompt:
          'You are designing a high-throughput text-processing service that must count graphemes, uppercase ASCII in place, and slice strings at code-point boundaries — all on the hot path. Discuss how string/[]byte/[]rune representations affect correctness and allocation, and recommend an approach.',
        answer:
          "The core tension is that Go strings are immutable UTF-8 byte sequences, so any in-place mutation forces a []byte copy, and any code-point-correct slicing requires decoding, not raw byte offsets. Naive s[i:j] slices at byte boundaries and can split a multi-byte rune, corrupting output; correct boundaries require utf8.DecodeRuneInString or a []rune conversion, the latter allocating O(n) int32s. For ASCII-uppercasing, converting to []byte once and mutating in place is cheap and avoids per-character allocation, and you can skip the []rune step entirely since ASCII bytes never appear as UTF-8 continuation bytes. Grapheme counting is subtler than rune counting: utf8.RuneCountInString counts code points, but user-perceived characters (combining marks, emoji ZWJ sequences) need a segmentation library like x/text; recommend that only if grapheme-accuracy is a real requirement, otherwise rune count is fine and far cheaper. Avoid []rune on the hot path unless you truly need random rune indexing, since it doubles-to-quadruples memory and copies; prefer streaming with utf8.DecodeRuneInString or a bufio-style scan. Recommendation: keep data as []byte through the pipeline, mutate ASCII in place, use utf8 decode helpers for boundary-aware slicing, and reserve []rune for genuinely index-heavy algorithms — this minimizes allocations while preserving UTF-8 correctness. Also exploit the compiler's zero-copy string([]byte) optimizations in map lookups and range to avoid needless conversions.",
      },
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
