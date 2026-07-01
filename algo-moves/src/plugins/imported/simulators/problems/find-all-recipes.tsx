import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { GraphBoard } from '../../../../components/GraphBoard';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, RailStack, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';
import { layeredLayout } from '../../../_shared/graphLayout';

interface RInput {
  recipes: string[];
  ingredients: string[][];
  supplies: string[];
}

interface RState {
  adj: number[][];
  pos: [number, number][];
  labels: string[];
  isRecipe: boolean[];
  color: number[]; // 0 unavailable, 2 in-queue (available), 1 consumed/made
  active: number | null;
  queue: number[];
  indeg: number[];
  made: number[]; // recipe nodes proven makeable, in order
  done: boolean;
}

function record({ recipes, ingredients, supplies }: RInput): Frame<RState>[] {
  // Node set: every distinct ingredient/supply plus every recipe.
  const labels: string[] = [];
  const idx = new Map<string, number>();
  const add = (name: string) => {
    if (!idx.has(name)) {
      idx.set(name, labels.length);
      labels.push(name);
    }
    return idx.get(name) as number;
  };
  supplies.forEach(add);
  ingredients.forEach((list) => list.forEach(add));
  recipes.forEach(add);

  const n = labels.length;
  const recipeSet = new Set(recipes);
  const isRecipe = labels.map((l) => recipeSet.has(l));

  const adj: number[][] = Array.from({ length: n }, () => []);
  const indeg = new Array<number>(n).fill(0);
  recipes.forEach((r, i) => {
    const rv = idx.get(r) as number;
    indeg[rv] = ingredients[i].length;
    for (const ing of ingredients[i]) {
      const iv = idx.get(ing) as number;
      adj[iv].push(rv); // ingredient → recipe
    }
  });

  // Layered layout: supplies, then recipes ordered by dependency depth.
  const supplyNodes = supplies.map((s) => idx.get(s) as number);
  const recipeNodes = recipes.map((r) => idx.get(r) as number);
  const pos = layeredLayout([supplyNodes, recipeNodes], n);

  // supplies are available from the start
  const color = new Array<number>(n).fill(0);
  for (const sv of supplyNodes) color[sv] = 2;
  const queue: number[] = supplyNodes.slice();
  const made: number[] = [];
  const { emit, frames } = createRecorder<RState>(() => ({
        adj: adj,
        pos: pos,
        labels: labels,
        isRecipe: isRecipe,
        color: color.slice(),
        queue: queue.slice(),
        indeg: indeg.slice(),
        made: made.slice(),
        active: null,
        done: false
      }));

  emit('INIT', 'build graph', `Model it as a DAG: draw an edge from each ingredient to every recipe that needs it, and set each recipe's in-degree to its ingredient count. A recipe is makeable once every ingredient pointing at it is available. Start a queue with the given supplies: [${supplies.join(', ')}].`, { active: null });

  emit('SEED', `available [${supplies.join(', ')}]`, `The supplies [${supplies.join(', ')}] are available with nothing to wait on, so they seed the queue.`, { active: null });

  while (queue.length > 0) {
    const v = queue.shift() as number;
    color[v] = 1;
    emit('POP', `have ${labels[v]}`, `"${labels[v]}" is now available — release it to every recipe that depends on it.`, { active: v });

    for (const nb of adj[v]) {
      indeg[nb]--;
      if (indeg[nb] === 0) {
        color[nb] = 2;
        queue.push(nb);
        made.push(nb);
        emit('MADE', `make ${labels[nb]}`, `"${labels[v]}" was the last ingredient "${labels[nb]}" was waiting on — all its inputs are ready, so "${labels[nb]}" is makeable. Add it to the answer and queue it as a new ingredient.`, { active: v });
      } else {
        emit('WAIT', `${labels[nb]} needs ${indeg[nb]}`, `"${labels[nb]}" still needs ${indeg[nb]} more ingredient${indeg[nb] === 1 ? '' : 's'} before it can be made.`, { active: nb });
      }
    }
  }

  const answer = made.map((m) => labels[m]);
  emit('DONE', `recipes ${answer.length}`, `Queue drained — the makeable recipes are [${answer.join(', ')}].`, { active: null , done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<RState>) {
  const s = frame.state;
  const recipeCount = s.isRecipe.filter(Boolean).length;
  const rail = (
    <>
      <RailStack
        label="queue"
        items={s.queue.map((n) => s.labels[n])}
        topLabel="front"
        highlightEnd="bottom"
      />
      <RailStack
        label="made"
        items={s.made.map((m) => s.labels[m])}
      />
      <RailGroup label="scan">
        <RailStat k="current" v={s.active !== null ? s.labels[s.active] : '—'} tone="accent" />
        <RailStat k="done" v={`${s.made.length}/${recipeCount}`} />
      </RailGroup>
      {s.done && (
        <RailResult
          label="recipes"
          value={`[${s.made.map((m) => s.labels[m]).join(', ')}]`}
          tone={s.made.length > 0 ? 'good' : 'bad'}
        />
      )}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={150}>
      <GraphBoard
        adj={s.adj}
        pos={s.pos}
        nodeClass={(node) => `team-${s.color[node]}`}
        label={(n) => s.labels[n]}
        activeNode={s.active}
        directed
        height={260}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<RState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const recipeCount = s.isRecipe.filter(Boolean).length;
  return (
    <VarGrid>
      <InspectorRow k="current" v={s.active !== null ? s.labels[s.active] : '—'} />
      <InspectorRow k="queue" v={s.queue.length ? `[${s.queue.map((n) => s.labels[n]).join(', ')}]` : '∅'} />
      <InspectorRow k="made" v={s.made.length ? `[${s.made.map((m) => s.labels[m]).join(', ')}]` : '∅'} />
      <InspectorRow k="recipes done" v={`${s.made.length} / ${recipeCount}`} />
    </VarGrid>
  );
}

const SANDWICH: RInput = {
  recipes: ['bread', 'sandwich'],
  ingredients: [
    ['yeast', 'flour'],
    ['bread', 'meat'],
  ],
  supplies: ['yeast', 'flour', 'meat'],
};

export const manifestId = 'imp-15-find-all-possible-recipes-from-given-supplies';
export const title = 'Find All Possible Recipes from Given Supplies';

export const simulator: ProblemSimulator = {
  inputs: [{ id: 'sandwich', label: 'bread → sandwich', value: SANDWICH }] satisfies SampleInput<RInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as RState | undefined;
    return { ok: true, label: `made ${s ? s.made.length : 0}` };
  },
};
