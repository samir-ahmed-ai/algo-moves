import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';

interface AndInput {
  nums: number[];
  numSlots: number;
}

interface AndState {
  nums: number[];
  numSlots: number;
  // Only the reachable masks, in increasing mask order — keeps the row tiny.
  masks: number[]; // mask value at each visible cell
  dp: number[]; // best AND-sum to reach that mask (-1 = not yet revealed)
  cur: number | null; // index into masks of the cell just finalised
  done: boolean;
  answer: number | null;
}

const NEG = -1;

// Mirror the Go encoding EXACTLY: 2 bits per slot, slot occupancy = (state >> 2*(slot-1)) & 3.
const occ = (state: number, slot: number) => (state >> (2 * (slot - 1))) & 3;
const assignedCount = (state: number, numSlots: number) => {
  let c = 0;
  for (let s = 1; s <= numSlots; s++) c += occ(state, s);
  return c;
};
// "1·0" style occupancy triple for a mask (how many numbers sit in slot 1, 2, …).
const occString = (state: number, numSlots: number) => {
  const parts: number[] = [];
  for (let s = 1; s <= numSlots; s++) parts.push(occ(state, s));
  return parts.join('·');
};

function record({ nums, numSlots }: AndInput): Frame<AndState>[] {
  const totalMask = 1 << (2 * numSlots);
  const dpFull = new Array<number>(totalMask).fill(NEG);
  dpFull[0] = 0;
  // Forward DP in increasing mask order; assigning the k-th number = nums[k].
  for (let mask = 0; mask < totalMask; mask++) {
    if (dpFull[mask] === NEG) continue;
    const idx = assignedCount(mask, numSlots);
    if (idx >= nums.length) continue;
    for (let slot = 1; slot <= numSlots; slot++) {
      if (occ(mask, slot) < 2) {
        const next = mask + (1 << (2 * (slot - 1)));
        const val = dpFull[mask] + (nums[idx] & slot);
        if (val > dpFull[next]) dpFull[next] = val;
      }
    }
  }

  // Collapse to just the reachable masks for a compact, faithful row.
  const masks = dpFull.map((v, i) => ({ v, i })).filter((o) => o.v !== NEG).map((o) => o.i);
  const maskValue = new Map(masks.map((m) => [m, dpFull[m]]));
  const visible = new Array<number>(masks.length).fill(NEG);
  const { emit, frames } = createRecorder<AndState>(() => ({
        nums: nums,
        numSlots: numSlots,
        masks: masks.slice(),
        dp: visible.slice(),
        cur: null,
        answer: null,
        done: false
      }));

  emit('INIT', `${nums.length} nums, ${numSlots} slots`, `Maximum AND Sum: assign every number in [${nums.join(', ')}] to one of ${numSlots} slots (each slot holds at most 2) to maximise Σ (num AND slotIndex). State = a base-2-per-slot mask of slot occupancy; dp[mask] = the best AND-sum once that many numbers are placed. Only reachable masks are shown; the index label is the slot-occupancy triple (slot1·slot2·…).`, { cur: null, answer: null });

  // Reveal each reachable mask in order. mask 0 (nothing placed) is the base.
  for (let k = 0; k < masks.length; k++) {
    const mask = masks[k];
    visible[k] = dpFull[mask];
    const cnt = assignedCount(mask, numSlots);
    if (mask === 0) {
      emit('BASE', `dp[0]=0`, `Base case: no number assigned yet (occupancy ${occString(mask, numSlots)}), so dp = 0.`, { cur: k, answer: null });
    } else {
      emit('FILL', `dp[${mask}]=${dpFull[mask]}`, `Mask ${mask} (occupancy ${occString(mask, numSlots)}) means ${cnt} number${cnt === 1 ? '' : 's'} placed. The best AND-sum to reach this arrangement is dp = ${dpFull[mask]}.`, { cur: k, answer: null });
    }
  }

  let best = 0;
  let bestK: number | null = null;
  masks.forEach((mask, k) => {
    if (assignedCount(mask, numSlots) === nums.length && (maskValue.get(mask) ?? 0) >= best) {
      best = maskValue.get(mask) ?? 0;
      bestK = k;
    }
  });
  emit('DONE', `${best}`, `Among masks that place all ${nums.length} numbers, the largest dp is ${best}. So the maximum AND sum is ${best}.`, { cur: bestK, answer: best , done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<AndState>) {
  const s = frame.state;
  const cells = s.dp.map((v) => (v === NEG ? '·' : v));
  const pointers: ArrayPointer[] = [];
  if (s.cur !== null) pointers.push({ i: s.cur, label: `mask ${s.masks[s.cur]}`, tone: 'accent', place: 'above' });
  const tone = (i: number) => {
    if (s.cur === i) return 'found';
    return s.dp[i] !== NEG ? 'match' : '';
  };
  const mask = s.cur !== null ? s.masks[s.cur] : null;
  const dpVal = s.cur !== null && s.dp[s.cur] !== NEG ? s.dp[s.cur] : null;
  return (
    <VizStage rail={<>
      <RailGroup label="current">
        <RailStat k="mask" v={mask ?? '—'} tone={mask !== null ? 'accent' : undefined} />
        <RailStat k="occ" v={mask !== null ? occString(mask, s.numSlots) : '—'} />
        <RailStat k="dp" v={dpVal ?? '—'} />
      </RailGroup>
      {s.answer !== null
        ? <RailResult label="answer" value={s.answer} tone="good" />
        : <RailResult label="answer" value="…" tone="accent" />}
    </>}>
      <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} label={(i) => occString(s.masks[i], s.numSlots)} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<AndState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const mask = s.cur !== null ? s.masks[s.cur] : null;
  return (
    <VarGrid>
      <InspectorRow k="nums" v={`[${s.nums.join(', ')}]`} />
      <InspectorRow k="slots" v={s.numSlots} />
      <InspectorRow k="current mask" v={mask ?? '—'} />
      <InspectorRow k="occupancy" v={mask !== null ? occString(mask, s.numSlots) : '—'} />
      <InspectorRow k="dp[mask]" v={s.cur !== null && s.dp[s.cur] !== NEG ? s.dp[s.cur] : '—'} />
      <InspectorRow k="answer" v={s.answer !== null ? s.answer : '…filling'} />
    </VarGrid>
  );
}

export const manifestId = 'imp-72-maximum-and-sum-of-array';
export const title = 'Maximum AND Sum of Array';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'n6s3', label: 'nums [1..6], 3 slots (answer 9)', value: { nums: [1, 2, 3, 4, 5, 6], numSlots: 3 } },
  ] satisfies SampleInput<AndInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as AndState | undefined;
    const v = s?.answer ?? 0;
    return { ok: true, label: `${v}` };
  },
};
