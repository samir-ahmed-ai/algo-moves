import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface FileEntry {
  path: string;
  size: number;
  isDir: boolean;
}

interface FindLargeInput {
  /** Flat walk order mimicking filepath.Walk. */
  entries: FileEntry[];
}

interface FindLargeState {
  entries: FileEntry[];
  idx: number | null;
  limit: number;
  matches: string[];
  activePath: string | null;
  done: boolean;
}

const LIMIT = 5 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${bytes}B`;
}

function record({ entries }: FindLargeInput): Frame<FindLargeState>[] {  const matches: string[] = [];

  const { emit, frames } = createRecorder<FindLargeState>(() => ({
        entries,
        idx: null,
        limit: LIMIT,
        matches: matches.slice(),
        activePath: null,
        done: false
      }));

  emit(
    'INIT',
    'limit=5M',
    `\`filepath.Walk\` visits every path under root. Skip directories; collect files where \`info.Size() > 5*1024*1024\`.`,
    {},
  );

  for (let idx = 0; idx < entries.length; idx++) {
    const e = entries[idx];
    if (e.isDir) {
      emit(
        'SKIP_DIR',
        e.path,
        `Visit "${e.path}" — it's a directory, return nil (don't add to matches).`,
        { idx, activePath: e.path },
      );
      continue;
    }
    if (e.size > LIMIT) {
      matches.push(e.path);
      emit(
        'MATCH',
        `${formatSize(e.size)}`,
        `File "${e.path}" size ${formatSize(e.size)} > 5M — append to matches.`,
        { idx, activePath: e.path, matches: matches.slice() },
        'good',
      );
    } else {
      emit(
        'SKIP',
        `${formatSize(e.size)}`,
        `File "${e.path}" size ${formatSize(e.size)} ≤ 5M — skip.`,
        { idx, activePath: e.path },
      );
    }
  }

  emit(
    'DONE',
    `${matches.length} matches`,
    `Walk complete. Found ${matches.length} file(s) larger than 5M: [${matches.join(', ')}].`,
    { matches: matches.slice(), done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<FindLargeState>) {
  const s = frame.state;
  const matchSet = new Set(s.matches);
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        limit = 5M ({s.limit.toLocaleString()} bytes)
      </div>
      <div className="space-y-0.5">
        {s.entries.map((e, i) => (
          <div
            key={e.path}
            className={cn(
              'flex justify-between rounded px-2 py-0.5 font-mono',
              vizText.sm,
              s.idx === i ? 'bg-accentbg text-accent' : matchSet.has(e.path) ? 'text-good' : 'text-ink',
            )}
          >
            <span>
              {e.isDir ? '📁' : '📄'} {e.path}
            </span>
            {!e.isDir && <span>{formatSize(e.size)}</span>}
          </div>
        ))}
      </div>
      {s.matches.length > 0 && (
        <div className={cn('mt-2 font-mono text-good', vizText.sm)}>
          matches: [{s.matches.join(', ')}]
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<FindLargeState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const e = s.idx !== null ? s.entries[s.idx] : null;
  return (
    <VarGrid>
      <InspectorRow k="idx" v={s.idx ?? '—'} />
      <InspectorRow k="path" v={s.activePath ?? '—'} />
      <InspectorRow k="size" v={e && !e.isDir ? formatSize(e.size) : '—'} />
      <InspectorRow k="matches" v={s.matches.length} />
    </VarGrid>
  );
}

export const manifestId = 'prep-streams-io-find-files-size-larger-than-5m';
export const title = 'Find files size larger than 5M';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Find files size larger than 5M\"?",
    choices: [
      {
        label: "Filesystem walk with size filter — fits this problem",
        correct: true
      },
      {
        label: "Buffered line iterator — different approach"
      },
      {
        label: "In-place byte reversal — different approach"
      },
      {
        label: "Streaming palindrome stack — different approach"
      }
    ],
    explain: "Walk every file; collect paths over the size threshold"
  },
  {
    id: "key-step",
    prompt: "On the \"SKIP\" step (), what happens?",
    choices: [
      {
        label: "File \"\" size ≤ 5M — — this move caption",
        correct: true
      },
      {
        label: "Run terminates immediately — no further frames"
      },
      {
        label: "Pointers reset to zero — restart scan"
      },
      {
        label: "Remaining input skipped — early return path"
      }
    ],
    explain: "File \"\" size  ≤ 5M — skip."
  },
  {
    id: "state",
    prompt: "What does the `entries` field track in the visualization state?",
    choices: [
      {
        label: "Field entries in state — updated each frame",
        correct: true
      },
      {
        label: "Fixed display label — unchanged each frame"
      },
      {
        label: "Shuffle seed value — for random ordering"
      },
      {
        label: "Failure error code — set once at end"
      }
    ],
    explain: "The recorder snapshots `entries` on every emit so each frame shows the algorithm mid-step."
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Find files size larger than 5M\"?",
    choices: [
      {
        label: "O(entries) time, O(matches) space — standard bounds here",
        correct: true
      },
      {
        label: "O(1) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(entries) time, O(depth) space — wrong order of growth"
      },
      {
        label: "O(2ⁿ) time, O(n) space — wrong order of growth"
      }
    ],
    explain: "O(entries). O(matches). filepath.Walk; skip dirs; Size()>5*1024*1024"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "Walk complete. Found file(s) larger than — final DONE caption",
        correct: true
      },
      {
        label: "Incomplete partial result — more steps needed"
      },
      {
        label: "Input left unchanged — no mutations applied"
      },
      {
        label: "Aborted run on failure — infinite loop detected"
      }
    ],
    explain: "Walk complete. Found  file(s) larger than 5M: []."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'ff1',
      label: 'mixed sizes',
      value: {
        entries: [
          { path: 'root', size: 0, isDir: true },
          { path: 'root/small.txt', size: 1024, isDir: false },
          { path: 'root/big.bin', size: 6 * 1024 * 1024, isDir: false },
          { path: 'root/medium.dat', size: 3 * 1024 * 1024, isDir: false },
          { path: 'root/huge.zip', size: 10 * 1024 * 1024, isDir: false },
        ],
      },
    },
    {
      id: 'ff2',
      label: 'none over 5M',
      value: {
        entries: [
          { path: 'root', size: 0, isDir: true },
          { path: 'root/a.txt', size: 100, isDir: false },
          { path: 'root/b.txt', size: 200, isDir: false },
        ],
      },
    },
  ] satisfies SampleInput<FindLargeInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as FindLargeState | undefined;
    return s?.done ? { ok: true, label: `${s.matches.length} matches` } : { ok: false, label: 'incomplete' };
  },
};
