import type { LessonDef } from './types';

export const greedyLessons: LessonDef[] = [
  {
    id: 'greedy-exchange-argument',
    title: 'When is a greedy choice provably optimal?',
    summary:
      "The exchange argument: morph any optimum into greedy's answer one safe swap at a time.",
    estimatedMinutes: 7,
    tags: ['greedy', 'proofs', 'exchange-argument'],
    blocks: [
      {
        kind: 'prose',
        text: 'A greedy algorithm commits to the best-looking choice at each step and never backtracks. That is fast — but _fast and wrong_ is easy to write. Before you trust a greedy rule, you have to **prove** it reaches an optimum. The **exchange argument** is the proof that does it most often.',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'The exchange argument',
      },
      {
        kind: 'prose',
        text: "Take any optimal solution `OPT` and compare it to greedy's. At the first step where they differ, show you can **swap greedy's choice into `OPT`** without making it worse. Repeat, and `OPT` transforms into greedy's answer while staying optimal — so greedy was optimal all along.",
      },
      {
        kind: 'steps',
        steps: [
          {
            title: 'Assume an optimum',
            caption:
              'Let `OPT` be any optimal solution that disagrees with greedy at the first differing step.',
          },
          {
            title: 'Exchange',
            caption:
              "Replace `OPT`'s choice at that step with greedy's, and argue the result is still valid and no worse.",
          },
          {
            title: 'Repeat',
            caption:
              "Each swap removes one disagreement without losing quality, so greedy's own solution must be optimal.",
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'remember',
        title: 'Greedy stays ahead',
        text: "The swap works because greedy's choice is never behind `OPT`'s. For interval scheduling, greedy takes the interval that **finishes earliest**, so it ends no later than whatever `OPT` chose — leaving at least as much room for everything after it.",
      },
      {
        kind: 'code',
        lang: 'go',
        code: "type Interval struct{ Start, End int }\n\n// canReplaceFirst reports whether greedy's pick g — the interval that\n// finishes earliest of all — can replace the first interval of ANY\n// compatible schedule without creating an overlap.\nfunc canReplaceFirst(g, optFirst Interval, rest []Interval) bool {\n\tif g.End > optFirst.End {\n\t\treturn false // g must finish no later than what it replaces\n\t}\n\tfor _, iv := range rest {\n\t\tif g.End > iv.Start {\n\t\t\treturn false // g would collide with a later interval\n\t\t}\n\t}\n\treturn true // when g finishes earliest this always holds — that is the proof\n}",
        caption: 'The swap is always safe when greedy finishes earliest',
      },
      {
        kind: 'callout',
        tone: 'note',
        title: "When the swap won't go through",
        text: "If you can't justify the exchange, greedy is probably wrong — and the swap that _fails_ usually hands you a concrete counterexample. That makes the exchange argument the fastest way to test a greedy rule, whether it passes or fails.",
      },
      {
        kind: 'keyPoints',
        points: [
          'Greedy is only correct once you prove it — speed is not correctness.',
          "Exchange argument: morph any optimum into greedy's answer one safe swap at a time.",
          "The lever is _greedy stays ahead_ — its choice is never worse than the optimum's at each step.",
        ],
      },
      {
        kind: 'problemRef',
        itemId: 'interval-scheduling',
        note: 'Book the most meetings, then check that every choice survives an exchange against any other schedule.',
      },
    ],
  },
  {
    id: 'greedy-interval-scheduling',
    title: 'Interval scheduling by earliest finish time',
    summary: 'Sort by end time and sweep — the cleanest provably-optimal greedy.',
    estimatedMinutes: 6,
    tags: ['greedy', 'intervals', 'scheduling', 'sorting'],
    blocks: [
      {
        kind: 'prose',
        text: "**Interval scheduling.** You're given intervals — meetings, jobs, talks — each with a start and an end. Pick the largest set that don't overlap. The winning rule is almost suspiciously simple: **always take the compatible interval that finishes earliest.**",
      },
      {
        kind: 'heading',
        level: 2,
        text: 'Sort by finish time, then sweep',
      },
      {
        kind: 'steps',
        steps: [
          {
            title: 'Sort',
            caption: 'Order every interval by **end** time, ascending.',
          },
          {
            title: 'Sweep',
            caption:
              "Walk left to right and keep an interval only if its start is at or after the last kept interval's end.",
          },
        ],
      },
      {
        kind: 'code',
        lang: 'go',
        code: 'import (\n\t"math"\n\t"sort"\n)\n\ntype Interval struct{ Start, End int }\n\n// maxNonOverlapping returns the largest set of mutually compatible\n// intervals, always taking the compatible one that finishes earliest.\nfunc maxNonOverlapping(ivs []Interval) []Interval {\n\tsort.Slice(ivs, func(i, j int) bool {\n\t\treturn ivs[i].End < ivs[j].End\n\t})\n\tchosen := make([]Interval, 0, len(ivs))\n\tlastEnd := math.MinInt\n\tfor _, iv := range ivs {\n\t\tif iv.Start >= lastEnd { // half-open: end == next start does not clash\n\t\t\tchosen = append(chosen, iv)\n\t\t\tlastEnd = iv.End\n\t\t}\n\t}\n\treturn chosen\n}',
        caption: 'Greedy interval scheduling in O(n log n)',
      },
      {
        kind: 'callout',
        tone: 'note',
        title: 'Touching is not overlapping',
        text: "Ends are **half-open**: a meeting that ends at 10:30 and one that starts at 10:30 don't clash. That is why the test is `start >= lastEnd`, not a strict `>`.",
      },
      {
        kind: 'prose',
        text: 'The sort dominates at `O(n log n)`; the sweep is a single `O(n)` pass. You look at each interval exactly once and never reconsider — the hallmark of a correct greedy.',
      },
      {
        kind: 'callout',
        tone: 'remember',
        title: 'Why earliest finish',
        text: 'Finishing earliest frees the calendar as soon as possible for everything still to come. The exchange argument makes this rigorous: any optimal schedule can swap in the earliest-finishing interval without losing a booking.',
      },
      {
        kind: 'keyPoints',
        points: [
          'Sort by **end** time, then greedily keep every interval compatible with the last one kept.',
          'Use `start >= lastEnd` — half-open intervals let back-to-back bookings coexist.',
          '`O(n log n)` total, dominated by the sort; the sweep is one linear pass.',
        ],
      },
      {
        kind: 'problemRef',
        itemId: 'interval-scheduling',
        note: 'Book the most non-overlapping meetings — this is the exact algorithm to reach for.',
      },
    ],
  },
  {
    id: 'greedy-scheduling-wrong-heuristics',
    title: "Greedy rules that look right but aren't",
    summary:
      'Earliest start, shortest, and fewest conflicts all fail — only earliest finish survives.',
    estimatedMinutes: 6,
    tags: ['greedy', 'intervals', 'scheduling'],
    blocks: [
      {
        kind: 'prose',
        text: "Interval scheduling has a dozen _plausible_ greedy rules and only one that works. The trap is that the wrong ones look right on small examples, then quietly fail on the inputs you didn't test.",
      },
      {
        kind: 'heading',
        level: 2,
        text: "Rules that look right but aren't",
      },
      {
        kind: 'list',
        items: [
          '**Earliest start time** — grab whoever starts first. One long early interval can swallow several short ones that all fit.',
          '**Shortest duration** — a tiny interval wedged between two others can knock out two longer bookings that were compatible with each other.',
          "**Fewest conflicts** — picking the interval that overlaps the fewest others still isn't safe; adversarial inputs beat it.",
        ],
      },
      {
        kind: 'code',
        lang: 'go',
        code: 'type Interval struct{ Start, End int }\n\n// counterexample breaks the tempting "earliest start" rule. Minutes since\n// midnight: a 9:00-11:00 block hides two short, mutually compatible meetings.\nfunc counterexample() []Interval {\n\treturn []Interval{\n\t\t{Start: 540, End: 660}, // All-hands  9:00-11:00  (starts first)\n\t\t{Start: 570, End: 600}, // Standup    9:30-10:00\n\t\t{Start: 615, End: 645}, // Coffee    10:15-10:45\n\t}\n}\n\n// earliest start  -> {All-hands}       = 1  (blocks both short meetings)\n// earliest finish -> {Standup, Coffee} = 2  (optimal)',
        caption: "One input that sinks the tempting 'earliest start' rule",
      },
      {
        kind: 'callout',
        tone: 'warn',
        title: 'Intuition is not a proof',
        text: 'Every one of these rules _feels_ optimal. The only one that survives an exchange argument is **earliest finish time** — trust the proof, not the vibe.',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'How to vet a greedy rule',
      },
      {
        kind: 'steps',
        steps: [
          {
            title: 'Attack it',
            caption:
              'Hand-build tiny adversarial inputs — nested intervals, a long interval hiding short ones inside its span.',
          },
          {
            title: 'Prove it or break it',
            caption:
              "Try the exchange argument. If a swap won't go through, that failed swap is your counterexample.",
          },
        ],
      },
      {
        kind: 'keyPoints',
        points: [
          'Earliest start, shortest duration, and fewest conflicts all fail — only earliest **finish** is optimal.',
          'Stress-test a greedy rule with nested and adversarial intervals before you trust it.',
          'A blocked exchange swap is exactly the counterexample that kills a bad rule.',
        ],
      },
      {
        kind: 'problemRef',
        itemId: 'interval-scheduling',
        note: "Try beating it with 'earliest start' first, then watch it lose a booking on the long-tempter layouts.",
      },
    ],
  },
];
