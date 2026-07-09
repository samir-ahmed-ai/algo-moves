import { catalog, GLOSSARY, type Catalog, type Item } from '@/content';
import {
  categoryIdForItem,
  getAllCategories,
  getItemsForCategory,
  searchBrowse,
  trackForCategory,
  type BrowseCategory,
} from '@/content/browse';
import { documentMatchesFacets, parseSearchTerms, scoreDocument } from './score';
import type { ClientSearchOptions, SearchDocument, SearchHit, SearchHitKind } from './types';

const DEFAULT_LIMIT = 40;
const RECENT_BOOST = 5;

/** Lightweight game entries — avoids importing React game components into the search index. */
const GAME_SEARCH_ENTRIES: ReadonlyArray<{ id: string; title: string; tagline: string }> = [
  {
    id: 'would-you-rather',
    title: 'Would You Rather',
    tagline: 'Fast this-or-that choices that reveal how closely the room thinks.',
  },
  {
    id: 'number-duel',
    title: 'Number Duel',
    tagline: 'Hide a number, read the clues, and crack the code first.',
  },
  {
    id: 'tic-tac-toe',
    title: 'Tic Tac Toe',
    tagline: 'A clean three-in-a-row duel with live turn pressure.',
  },
  {
    id: 'rock-paper-scissors',
    title: 'Rock Paper Scissors',
    tagline: 'Lock a throw, reveal together, and win the best-of-five race.',
  },
  {
    id: 'mind-meld',
    title: 'Mind Meld',
    tagline: 'Say the same word at the same time.',
  },
  {
    id: 'reaction-duel',
    title: 'Reaction Duel',
    tagline: 'Wait for green, avoid the false start, and hit first.',
  },
];

function uniqueKeywords(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.map((v) => v?.trim()).filter((v): v is string => !!v)));
}

export function itemToSearchDocument(item: Item, catalogRef: Catalog = catalog): SearchDocument {
  const categoryId = categoryIdForItem(item.id, catalogRef);
  const track = categoryId ? trackForCategory(categoryId) : undefined;
  return {
    kind: 'problem',
    id: item.id,
    title: item.title,
    subtitle: item.difficulty ?? item.kind,
    keywords: uniqueKeywords([
      item.id,
      item.pluginId,
      item.summary,
      item.courseId,
      item.topicId,
      item.source?.label,
      ...item.tags,
    ]),
    facets: {
      ...(item.difficulty ? { difficulty: item.difficulty } : {}),
      ...(track ? { track: track.id } : {}),
      ...(categoryId ? { categoryId } : {}),
    },
  };
}

export function categoryToSearchDocument(cat: BrowseCategory): SearchDocument {
  return {
    kind: 'category',
    id: cat.id,
    title: cat.title,
    subtitle: 'category',
    keywords: uniqueKeywords([cat.summary, cat.description]),
  };
}

function buildStaticIndex(catalogRef: Catalog): SearchDocument[] {
  const docs: SearchDocument[] = [];
  const seenProblems = new Set<string>();

  for (const cat of getAllCategories()) {
    docs.push(categoryToSearchDocument(cat));
    for (const item of getItemsForCategory(cat.id, catalogRef)) {
      if (!item.pluginId || seenProblems.has(item.id)) continue;
      seenProblems.add(item.id);
      docs.push(itemToSearchDocument(item, catalogRef));
    }
  }

  for (const item of catalogRef.items) {
    if (!item.pluginId || seenProblems.has(item.id)) continue;
    seenProblems.add(item.id);
    docs.push(itemToSearchDocument(item, catalogRef));
  }

  for (const term of GLOSSARY) {
    docs.push({
      kind: 'glossary',
      id: `glossary:${term.term}`,
      title: term.term,
      subtitle: 'glossary',
      keywords: uniqueKeywords([term.def, ...(term.tags ?? [])]),
    });
  }

  for (const game of GAME_SEARCH_ENTRIES) {
    docs.push({
      kind: 'game',
      id: game.id,
      title: game.title,
      subtitle: 'game',
      keywords: uniqueKeywords([game.tagline, game.id]),
    });
  }

  return docs;
}

let cachedCatalog: Catalog | null = null;
let cachedIndex: SearchDocument[] | null = null;

/** Reset cached index (tests). */
export function resetClientSearchIndex(): void {
  cachedCatalog = null;
  cachedIndex = null;
}

export function getClientSearchIndex(catalogRef: Catalog = catalog): SearchDocument[] {
  if (cachedIndex && cachedCatalog === catalogRef) return cachedIndex;
  cachedCatalog = catalogRef;
  cachedIndex = buildStaticIndex(catalogRef);
  return cachedIndex;
}

function kindAllowed(kind: SearchHitKind, kinds?: SearchHitKind[]): boolean {
  if (!kinds || kinds.length === 0) return true;
  return kinds.includes(kind);
}

/**
 * Ranked client search over the static catalog (+ optional extra docs).
 * Empty query returns docs with score 1 (useful for recent/all lists); callers
 * that want no results on empty query should check `query.trim()` themselves.
 */
export function searchClient(
  query: string,
  opts: ClientSearchOptions & { catalog?: Catalog } = {},
): SearchHit[] {
  const catalogRef = opts.catalog ?? catalog;
  const terms = parseSearchTerms(query);
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const recent = new Set(opts.recentIds ?? []);
  const base = getClientSearchIndex(catalogRef);
  const pool = opts.extra?.length ? [...base, ...opts.extra] : base;

  const scored: SearchHit[] = [];
  for (const doc of pool) {
    if (!kindAllowed(doc.kind, opts.kinds)) continue;
    if (!documentMatchesFacets(doc, opts.facets)) continue;

    let score: number;
    if (terms.length === 0) {
      score = 1;
    } else {
      score = scoreDocument(doc, terms);
      if (score <= 0) continue;
    }
    if (recent.has(doc.id) || recent.has(`${doc.kind}:${doc.id}`)) score += RECENT_BOOST;

    scored.push({ ...doc, score });
  }

  scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return scored.slice(0, limit);
}

/** Ranked problem + category search for browse surfaces. */
export function searchBrowseRanked(
  query: string,
  catalogRef: Catalog = catalog,
): { categories: BrowseCategory[]; items: Item[] } {
  return searchBrowse(query, catalogRef);
}
