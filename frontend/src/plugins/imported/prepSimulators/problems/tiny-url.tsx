import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder } from '../strictHelpers';
import type { ProblemSimulator } from '../types';
import {
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
  RailStack,
  InspectorRow,
  VarGrid,
  VizEmpty,
} from '../../../_shared/vizKit';

type TinyOp = { kind: 'encode'; url: string } | { kind: 'decode'; short: string };

interface TinyInput {
  host: string;
  ops: TinyOp[];
}

interface TinyState {
  host: string;
  toShort: Record<string, string>;
  toLong: Record<string, string>;
  nextID: number;
  op: string;
  result: string;
  done: boolean;
}

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function encodeID(id: number): string {
  if (id === 0) return DIGITS[0]!;
  const out: string[] = [];
  let n = id;
  while (n > 0) {
    out.push(DIGITS[n % 62]!);
    n = Math.floor(n / 62);
  }
  return out.reverse().join('');
}

function record({ host, ops }: TinyInput): Frame<TinyState>[] {
  const toShort: Record<string, string> = {};
  const toLong: Record<string, string> = {};
  let nextID = 0;

  const { emit, frames } = createPrepRecorder<TinyState>(() => ({
    host,
    toShort: { ...toShort },
    toLong: { ...toLong },
    nextID,
    op: '',
    result: '',
    done: false,
  }));

  emit(
    'INIT',
    host,
    `Tiny URL: maps long URL ↔ short code at ${host}/<base62-id>. encode() assigns nextID; duplicate long URLs reuse existing short link.`,
    {},
  );

  for (const o of ops) {
    if (o.kind === 'encode') {
      if (toLong[o.url]!) {
        const short = toLong[o.url]!;
        emit(
          'ENCODE',
          'cache hit',
          `encode("${o.url}"): already encoded → return cached ${short}.`,
          { op: `encode`, result: short },
          'good',
        );
        continue;
      }
      nextID++;
      const code = encodeID(nextID);
      const short = `${host}/${code}`;
      toShort[short]! = o.url;
      toLong[o.url]! = short;
      emit(
        'ENCODE',
        `id ${nextID}`,
        `encode("${o.url}"): nextID=${nextID} → base62 "${code}" → short URL ${short}. Store both directions in maps.`,
        { op: 'encode', result: short },
        'good',
      );
    } else {
      const long = toShort[o.short]!;
      if (!long) {
        emit(
          'DECODE',
          'miss',
          `decode("${o.short}"): not in toShort map → return false.`,
          { op: 'decode', result: '' },
          'bad',
        );
      } else {
        emit(
          'DECODE',
          'hit',
          `decode("${o.short}"): lookup toShort → long URL "${long}".`,
          { op: 'decode', result: long },
          'good',
        );
      }
    }
  }

  emit(
    'DONE',
    `${Object.keys(toLong).length} urls`,
    `Done. ${Object.keys(toLong).length} URL(s) encoded.`,
    { op: 'done', done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<TinyState>) {
  const s = frame.state;
  const pairs = Object.entries(s.toLong);
  const mappings = pairs.map(([long, short]) => ({
    label: `${short} → ${long}`,
    tone: 'good' as const,
  }));
  const rail = (
    <>
      <RailGroup label="op">
        <RailStat k="op" v={s.op || '—'} tone="accent" />
        <RailStat k="nextID" v={s.nextID} />
      </RailGroup>
      <RailStack label="url map" items={mappings.length ? mappings : []} />
      {s.result && <RailResult label="result" value={s.result} tone={s.done ? 'good' : 'accent'} />}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={180}>
      <div className="mt-1 max-h-48 space-y-1 overflow-auto">
        {pairs.length === 0 ? (
          <span className="text-sm text-ink3">no mappings yet</span>
        ) : (
          pairs.map(([long, short]) => (
            <div key={long} className="rounded border border-edge px-2 py-0.5 text-xs">
              <div className="font-mono text-accent">{short}</div>
              <div className="text-ink2 truncate">{long}</div>
            </div>
          ))
        )}
      </div>
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<TinyState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state as TinyState;
  return (
    <VarGrid>
      <InspectorRow k="nextID" v={s.nextID} />
      <InspectorRow k="encoded count" v={Object.keys(s.toLong).length} />
      <InspectorRow k="last result" v={s.result || '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-tiny-url';
export const title = 'Tiny URL';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'How are long URLs mapped to short links here?',
    choices: [
      {
        label: 'Counter plus base62 — toShort and toLong bidirectional maps',
        correct: true,
      },
      {
        label: 'Sorted interval merge — addRange combines overlapping spans',
      },
      {
        label: 'Reservoir sampling — uniform random index over matches',
      },
      {
        label: 'Jump-pointer line — skip painted cells on a number axis',
      },
    ],
    explain: 'Each new long URL gets nextID encoded to base62 and stored in both map directions.',
  },
  {
    id: 'key-step',
    prompt: 'On ENCODE for a brand-new long URL, what happens?',
    choices: [
      {
        label: 'Increment nextID — base62 code, store host/code in both maps',
        correct: true,
      },
      {
        label: 'Hash the URL body — derive code without a running counter',
      },
      {
        label: 'Push snapshot copy — append new version to history stack',
      },
      {
        label: 'Walk digit trie — collect names at prefix node',
      },
    ],
    explain:
      'nextID increments, encodeID produces the path segment, and both toShort and toLong update.',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for Tiny URL?',
    choices: [
      {
        label: 'O(1) encode/decode time, O(urls) space — two hash maps',
        correct: true,
      },
      {
        label: 'O(log n) pick time, O(n) space — prefix binary search',
      },
      {
        label: 'O(digits) time, O(contacts) space — trie per phone digit',
      },
      {
        label: 'O(n log n) time, O(n) space — resort all codes each encode',
      },
    ],
    explain:
      'Map lookups and counter increment are constant; storage grows with distinct URLs encoded.',
  },
  {
    id: 'edge',
    prompt: 'What happens when encode is called again on the same long URL?',
    choices: [
      {
        label: 'Return cached short link — nextID does not increment again',
        correct: true,
      },
      {
        label: 'Assign fresh code — duplicate long URLs get new IDs',
      },
      {
        label: 'Return empty string — treat duplicate as encode failure',
      },
      {
        label: 'Overwrite toLong map — invalidate prior short mapping',
      },
    ],
    explain: 'toLong already holds the short URL, so encode returns it without bumping nextID.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'tiny1',
      label: 'encode leetcode · decode short',
      value: {
        host: 'https://tiny.example',
        ops: [
          { kind: 'encode', url: 'https://leetcode.com/problems/design-tiny-url' },
          { kind: 'encode', url: 'https://google.com' },
          { kind: 'decode', short: 'https://tiny.example/1' },
        ],
      },
    },
  ] satisfies SampleInput<TinyInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as TinyState | undefined;
    return s?.done
      ? { ok: true, label: `${Object.keys(s.toLong).length} urls` }
      : { ok: false, label: 'incomplete' };
  },
};
