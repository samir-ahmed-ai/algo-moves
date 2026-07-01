import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, RailGroup, RailResult, RailStack, RailStat, VarGrid, VizEmpty, VizStage, vizText } from '../../../_shared/vizKit';

interface IPInput {
  digits: string;
}

interface IPState {
  digits: string;
  octets: string[]; // octets committed so far (0..4)
  cursor: number; // index into digits where the next octet starts
  consider: string | null; // slice currently being tested
  results: string[];
  done: boolean;
}

function validOctet(part: string): boolean {
  if (part.length === 0 || part.length > 3) return false;
  if (part.length > 1 && part[0] === '0') return false;
  return Number(part) <= 255;
}

function record({ digits }: IPInput): Frame<IPState>[] {
  const frames: Frame<IPState>[] = [];
  const octets: string[] = [];
  const results: string[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    cursor: number,
    consider: string | null,
    tone?: 'good',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        digits,
        octets: octets.slice(),
        cursor,
        consider,
        results: results.slice(),
        done: type === 'DONE',
      },
    });

  emit(
    'INIT',
    `"${digits}"`,
    `Split the ${digits.length} digits of "${digits}" into 4 octets, each 0-255 with no leading zeros (except "0"). Try octet lengths 1-3, recurse on the rest, then backtrack to try the next length.`,
    0,
    null,
  );

  const backtrack = (start: number, depth: number) => {
    if (depth === 4) {
      if (start === digits.length) {
        const addr = octets.join('.');
        results.push(addr);
        emit('RECORD', `+${addr}`, `All 4 octets placed and every digit used — record ${addr} (${results.length} so far).`, start, null, 'good');
      } else {
        emit('PRUNE', 'leftover digits', `4 octets placed but ${digits.length - start} digit(s) remain unused — dead end, backtrack.`, start, null);
      }
      return;
    }
    for (let len = 1; len <= 3 && start + len <= digits.length; len++) {
      const part = digits.slice(start, start + len);
      if (!validOctet(part)) {
        emit('REJECT', `✗ ${part}`, `Octet ${depth + 1}: "${part}" is invalid (${part.length > 1 && part[0] === '0' ? 'leading zero' : '> 255'}) — skip this length.`, start, part);
        if (part.length > 1 && part[0] === '0') break;
        continue;
      }
      octets.push(part);
      emit('CHOOSE', `${part}`, `Octet ${depth + 1}: take "${part}" (valid, 0-255). Recurse on the remaining digits.`, start + len, part);
      backtrack(start + len, depth + 1);
      octets.pop();
      emit('BACKTRACK', `undo ${part}`, `Backtrack: drop octet "${part}" and try a longer slice for octet ${depth + 1}.`, start, part);
    }
  };

  backtrack(0, 0);
  emit('DONE', `${results.length} address${results.length === 1 ? '' : 'es'}`, `All splits explored — ${results.length} valid IP address${results.length === 1 ? '' : 'es'} for "${digits}".`, digits.length, null, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<IPState>) {
  const s = frame.state;
  const placed = s.octets.join('.');
  const partial = placed + (s.consider !== null ? (placed ? '.' : '') + s.consider : '');
  const rest = s.digits.slice(s.cursor);
  const rail = (
    <>
      <RailStack
        label="results"
        items={s.results.map(String)}
        highlightEnd="bottom"
        topLabel="latest"
      />
      <RailGroup label="scan">
        <RailStat k="octets" v={s.octets.length} />
        <RailStat k="cursor" v={s.cursor} />
        <RailStat k="try" v={s.consider ?? '—'} tone="accent" />
      </RailGroup>
      {s.done && (
        <RailResult
          label="found"
          value={s.results.length}
          tone={s.results.length > 0 ? 'good' : 'bad'}
        />
      )}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={150}>
      <div className={cn(vizText.sm, 'text-ink3')}>
        digits = <span className="font-mono text-ink">{s.digits}</span>
      </div>
      <div className={cn('mt-2 text-ink3', vizText.sm)}>
        partial address
        <div className={cn('mt-1 font-mono text-ink', vizText.cell)}>
          {partial || <span className="text-ink3">·</span>}
          {rest && <span className="text-ink3"> | {rest}</span>}
        </div>
      </div>
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<IPState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="digits" v={s.digits} />
      <InspectorRow k="octets placed" v={s.octets.length} />
      <InspectorRow k="cursor" v={s.cursor} />
      <InspectorRow k="found" v={s.results.length} />
    </VarGrid>
  );
}

export const manifestId = 'imp-40-restore-ip-addresses';
export const title = 'Restore IP Addresses';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: '25525511135', label: '"25525511135"', value: { digits: '25525511135' } },
    { id: '0000', label: '"0000"', value: { digits: '0000' } },
  ] satisfies SampleInput<IPInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as IPState | undefined;
    const n = s ? s.results.length : 0;
    return { ok: true, label: `${n} address${n === 1 ? '' : 'es'}` };
  },
};
