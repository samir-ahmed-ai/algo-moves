/**
 * Builds the swipe deck for a category (topic). Each problem becomes a small run
 * of cards — animate → quiz questions → reassemble — and the runner walks
 * problem-by-problem so finishing one rolls straight into the next.
 */
import { loadPlugin } from '../../core';
import type { CodePiece, PluginCode, ProblemPlugin, QuizQuestion } from '../../core/types';
import { resolveCodePieces, MIN_REASSEMBLE_PIECES } from '@/lib/code';
import type { Item, Topic } from '../../content';
import { gistFor } from '../../content/gists';

export type MobileCardKind = 'gist' | 'animate' | 'quiz' | 'reassemble';

interface BaseCard {
  /** Stable key within the deck. */
  key: string;
}

export interface GistCard extends BaseCard {
  kind: 'gist';
  /** One concise statement of what the problem asks. */
  gist: string;
}
export interface AnimateCard extends BaseCard {
  kind: 'animate';
}
export interface QuizCard extends BaseCard {
  kind: 'quiz';
  question: QuizQuestion;
  /** 1-based position within this problem's quiz. */
  qIndex: number;
  qCount: number;
}
export interface ReassembleCard extends BaseCard {
  kind: 'reassemble';
  pieces: CodePiece[];
}

export type MobileCard = GistCard | AnimateCard | QuizCard | ReassembleCard;

/** One problem's worth of cards, plus the resolved metadata the cards render. */
export interface ProblemBlock {
  item: Item;
  plugin: ProblemPlugin;
  /** First language port of the solution, if the plugin ships code. */
  code?: PluginCode;
  tags: string[];
  pattern?: string;
  cards: MobileCard[];
  quizCount: number;
}

export interface MobileDeck {
  topic: Topic;
  blocks: ProblemBlock[];
  /** Total quiz questions across the whole category. */
  totalQuiz: number;
}

const PATTERN_TAGS = new Set([
  'bfs',
  'dfs',
  'backtracking',
  'dynamic-programming',
  'dp',
  'binary-search',
  'two-pointers',
  'sliding-window',
  'union-find',
  'topological-sort',
  'dijkstra',
  'greedy',
  'heap',
  'priority-queue',
  'sorting',
  'recursion',
  'memoization',
  'graph',
  'tree',
  'trie',
  'monotonic-stack',
]);

function prettyTag(tag: string): string {
  return tag.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function patternFor(tags: string[]): string | undefined {
  const hit = tags.find((t) => PATTERN_TAGS.has(t));
  return hit ? prettyTag(hit) : undefined;
}

async function blockFor(item: Item): Promise<ProblemBlock | null> {
  if (!item.pluginId) return null;
  const plugin = await loadPlugin(item.pluginId);
  if (!plugin) return null;
  const code = plugin.code;
  const quiz = plugin.quiz ?? [];
  const pieces = code?.text ? resolveCodePieces(code.text, plugin.codePieces) : null;
  const tags = item.tags ?? [];

  const cards: MobileCard[] = [
    { kind: 'gist', key: `${item.id}:gist`, gist: gistFor(item) },
    { kind: 'animate', key: `${item.id}:anim` },
  ];

  quiz.forEach((question, i) => {
    cards.push({
      kind: 'quiz',
      key: `${item.id}:q${i}`,
      question,
      qIndex: i + 1,
      qCount: quiz.length,
    });
  });

  if (pieces && pieces.length >= MIN_REASSEMBLE_PIECES) {
    cards.push({ kind: 'reassemble', key: `${item.id}:asm`, pieces });
  }

  return {
    item,
    plugin,
    code,
    tags,
    pattern: patternFor(tags),
    cards,
    quizCount: quiz.length,
  };
}

export async function buildDeck(topic: Topic): Promise<MobileDeck> {
  const built = await Promise.all(topic.items.map(blockFor));
  const blocks = built.filter((b): b is ProblemBlock => b != null);
  const totalQuiz = blocks.reduce((n, b) => n + b.quizCount, 0);
  return { topic, blocks, totalQuiz };
}

/** Lightweight stats for browse cards — avoids re-rendering full deck UIs. */
export interface DeckSummary {
  problems: number;
  totalQuiz: number;
  withReassemble: number;
}

export async function deckSummary(topic: Topic): Promise<DeckSummary> {
  const deck = await buildDeck(topic);
  const withReassemble = deck.blocks.filter((b) => b.cards.some((c) => c.kind === 'reassemble')).length;
  return { problems: deck.blocks.length, totalQuiz: deck.totalQuiz, withReassemble };
}

export function correctIndex(question: QuizQuestion): number {
  return question.choices.findIndex((c) => c.correct);
}
