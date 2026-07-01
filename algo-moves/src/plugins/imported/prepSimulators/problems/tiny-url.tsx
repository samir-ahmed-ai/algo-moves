import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, RailStack, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';

type TinyOp =
  | { kind: 'encode'; url: string }
  | { kind: 'decode'; short: string };

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
  if (id === 0) return DIGITS[0];
  const out: string[] = [];
  let n = id;
  while (n > 0) {
    out.push(DIGITS[n % 62]);
    n = Math.floor(n / 62);
  }
  return out.reverse().join('');
}

function record({ host, ops }: TinyInput): Frame<TinyState>[] {
  const frames: Frame<TinyState>[] = [];
  const toShort: Record<string, string> = {};
  const toLong: Record<string, string> = {};
  let nextID = 0;

  const emit = (type: string, note: string, caption: string, s: Partial<TinyState>, tone?: 'good' | 'bad') =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        host,
        toShort: { ...toShort },
        toLong: { ...toLong },
        nextID,
        op: '',
        result: '',
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    host,
    `Tiny URL: maps long URL ↔ short code at ${host}/<base62-id>. encode() assigns nextID; duplicate long URLs reuse existing short link.`,
    {},
  );

  for (const o of ops) {
    if (o.kind === 'encode') {
      if (toLong[o.url]) {
        const short = toLong[o.url];
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
      toShort[short] = o.url;
      toLong[o.url] = short;
      emit(
        'ENCODE',
        `id ${nextID}`,
        `encode("${o.url}"): nextID=${nextID} → base62 "${code}" → short URL ${short}. Store both directions in maps.`,
        { op: 'encode', result: short },
        'good',
      );
    } else {
      const long = toShort[o.short];
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
  const mappings = pairs.map(([long, short]) => ({ label: `${short} → ${long}`, tone: 'good' as const }));
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

export const simulator: ProblemSimulator = {
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
    return s?.done ? { ok: true, label: `${Object.keys(s.toLong).length} urls` } : { ok: false, label: 'incomplete' };
  },
};
