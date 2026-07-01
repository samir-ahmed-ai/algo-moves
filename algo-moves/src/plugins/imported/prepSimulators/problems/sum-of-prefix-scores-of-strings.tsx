import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface PrefixScoresInput {
  words: string[];
}

/** One trie node: 26 child slots (by index) plus how many inserted words pass through it. */
interface TrieNode {
  ch: (number | null)[]; // child node index per letter (a..z), or null
  count: number;
}

interface PrefixScoresState {
  words: string[];
  phase: 'build' | 'score' | 'done';
  wi: number | null; // current word index
  chars: string[]; // characters of the current word
  ci: number | null; // current char index inside the current word
  count: number | null; // count stored at the node we just walked to
  running: number | null; // running prefix-score sum for the current word
  res: (number | null)[]; // final score per word (null until computed)
  answer: number | null; // total = sum(res)
}

function record({ words }: PrefixScoresInput): Frame<PrefixScoresState>[] {
  const frames: Frame<PrefixScoresState>[] = [];

  // Trie stored as a flat node pool so state snapshots stay plain data.
  const pool: TrieNode[] = [{ ch: new Array<number | null>(26).fill(null), count: 0 }];
  const newNode = (): number => {
    pool.push({ ch: new Array<number | null>(26).fill(null), count: 0 });
    return pool.length - 1;
  };

  const res: (number | null)[] = words.map(() => null);

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<PrefixScoresState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        words,
        phase: 'build',
        wi: null,
        chars: [],
        ci: null,
        count: null,
        running: null,
        res: res.slice(),
        answer: null,
        ...s,
      },
    });

  emit(
    'INIT',
    `${words.length} words`,
    `Sum of Prefix Scores: the score of a word is the number of (word, prefix) pairs whose prefix equals a prefix of that word — i.e. how many words share each of its prefixes, summed over all its prefixes. We insert every word into a trie, counting how many words pass through each node, then re-walk each word adding those counts.`,
    { phase: 'build' },
  );

  // Phase 1 — build the trie, incrementing count on every node we pass through.
  for (let w = 0; w < words.length; w++) {
    const word = words[w];
    const chars = word.split('');
    emit(
      'WORD',
      `insert "${word}"`,
      `Insert "${word}" into the trie. Starting at the root, we follow one child edge per character, creating nodes as needed.`,
      { phase: 'build', wi: w, chars, ci: null },
    );
    let cur = 0; // root index
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i].charCodeAt(0) - 97;
      let created = false;
      if (pool[cur].ch[c] === null) {
        pool[cur].ch[c] = newNode();
        created = true;
      }
      cur = pool[cur].ch[c] as number;
      pool[cur].count++;
      emit(
        'PASS',
        `count[${word.slice(0, i + 1)}]=${pool[cur].count}`,
        `Walk to the node for prefix "${word.slice(0, i + 1)}"${created ? ' (newly created)' : ''} and bump its counter to ${pool[cur].count}. This counter tracks how many inserted words share that prefix.`,
        { phase: 'build', wi: w, chars, ci: i, count: pool[cur].count },
      );
    }
  }

  // Phase 2 — for each word, re-walk and sum the count at each prefix node.
  for (let w = 0; w < words.length; w++) {
    const word = words[w];
    const chars = word.split('');
    emit(
      'SCORE',
      `score "${word}"`,
      `Now score "${word}". Re-walk it from the root and add up the counter at each prefix node — that sum is the word's prefix score.`,
      { phase: 'score', wi: w, chars, ci: null, running: 0, res: res.slice() },
    );
    let cur = 0; // root index
    let running = 0;
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i].charCodeAt(0) - 97;
      cur = pool[cur].ch[c] as number;
      const nodeCount = pool[cur].count;
      running += nodeCount;
      emit(
        'ADD',
        `+${nodeCount} → ${running}`,
        `Prefix "${word.slice(0, i + 1)}" is shared by ${nodeCount} word${nodeCount === 1 ? '' : 's'}, so add ${nodeCount}. Running score for "${word}" is now ${running}.`,
        { phase: 'score', wi: w, chars, ci: i, count: nodeCount, running, res: res.slice() },
      );
    }
    res[w] = running;
    emit(
      'RESULT',
      `res[${w}]=${running}`,
      `Finished "${word}": its prefix score is ${running}. Store res[${w}] = ${running}.`,
      { phase: 'score', wi: w, chars, ci: chars.length - 1, running, res: res.slice() },
      'good',
    );
  }

  const answer = res.reduce<number>((a, v) => a + (v ?? 0), 0);
  emit(
    'DONE',
    `sum = ${answer}`,
    `All words scored. The prefix scores are [${res.join(', ')}], which sum to ${answer}.`,
    { phase: 'done', res: res.slice(), answer },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<PrefixScoresState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.ci !== null && s.ci >= 0)
    pointers.push({ i: s.ci, label: s.phase === 'build' ? 'insert' : 'walk', tone: 'accent', place: 'above' });
  const tone = (i: number) => {
    if (s.ci === null) return '';
    if (i < s.ci) return 'match'; // prefix already walked
    if (i === s.ci) return 'found'; // current char
    return '';
  };
  const wordLabel = s.wi !== null ? s.words[s.wi] : '';
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.phase === 'build' && 'Phase 1 · build trie (count per prefix)'}
        {s.phase === 'score' && 'Phase 2 · score words (sum prefix counts)'}
        {s.phase === 'done' && 'Done · prefix scores computed'}
        {s.wi !== null && (
          <>
            {' · '}word[{s.wi}] = <span className="font-mono text-ink">"{wordLabel}"</span>
          </>
        )}
      </div>
      {s.chars.length > 0 ? (
        <ArrayRow values={s.chars} cellTone={tone} pointers={pointers} windowRange={null} />
      ) : (
        <div className={cn('font-mono text-ink3', vizText.sm)}>—</div>
      )}
      {(s.phase === 'build' || s.phase === 'score') && s.count !== null && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
          {s.phase === 'build' ? (
            <>node count = <span className="text-ink">{s.count}</span></>
          ) : (
            <>
              +<span className="text-ink">{s.count}</span> · running ={' '}
              <span className="text-ink">{s.running}</span>
            </>
          )}
        </div>
      )}
      <div className={cn('mt-2 font-mono', vizText.sm, 'text-ink3')}>
        res [{s.res.map((v) => (v === null ? '·' : v)).join(', ')}]
        {s.answer !== null && (
          <span className={cn('ml-2 text-good', vizText.base)}>→ sum = {s.answer}</span>
        )}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<PrefixScoresState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const curWord = s.wi !== null ? s.words[s.wi] : '—';
  const prefix = s.wi !== null && s.ci !== null && s.ci >= 0 ? s.words[s.wi].slice(0, s.ci + 1) : '—';
  return (
    <VarGrid>
      <InspectorRow k="phase" v={s.phase} />
      <InspectorRow k="word" v={s.wi !== null ? `"${curWord}"` : '—'} />
      <InspectorRow k="prefix" v={prefix === '—' ? '—' : `"${prefix}"`} />
      <InspectorRow k="node count" v={s.count ?? '—'} />
      <InspectorRow k="running score" v={s.running ?? '—'} />
      <InspectorRow k="answer" v={s.answer ?? (s.phase === 'done' ? 'none' : '…')} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-sum-of-prefix-scores-of-strings';
export const title = 'Sum of Prefix Scores of Strings';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'sp1', label: '["abc","ab","bc","b"]', value: { words: ['abc', 'ab', 'bc', 'b'] } },
    { id: 'sp2', label: '["abcd","ab","bc","cba"]', value: { words: ['abcd', 'ab', 'bc', 'cba'] } },
  ] satisfies SampleInput<PrefixScoresInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PrefixScoresState | undefined;
    if (!s || s.answer === null) return { ok: false, label: 'no result' };
    return { ok: true, label: `[${s.res.map((v) => v ?? 0).join(',')}] sum=${s.answer}` };
  },
};
