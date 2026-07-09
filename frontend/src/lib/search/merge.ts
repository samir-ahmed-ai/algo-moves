import type { SearchHit, SearchHitKind, SearchSection, ServerSearchHit } from './types';

const SECTION_ORDER: ReadonlyArray<{ id: string; label: string; kinds: SearchHitKind[] }> = [
  { id: 'recent', label: 'Recent', kinds: [] },
  { id: 'problems', label: 'Problems', kinds: ['problem'] },
  { id: 'categories', label: 'Categories', kinds: ['category'] },
  { id: 'glossary', label: 'Glossary', kinds: ['glossary'] },
  { id: 'plans', label: 'Plans', kinds: ['plan'] },
  { id: 'resumes', label: 'Resumes', kinds: ['resume'] },
  { id: 'interviews', label: 'Interviews', kinds: ['interview'] },
  { id: 'canvases', label: 'Canvases', kinds: ['canvas'] },
  { id: 'games', label: 'Games', kinds: ['game'] },
  { id: 'actions', label: 'Actions', kinds: ['action', 'panel', 'effect'] },
];

export function serverHitToSearchHit(hit: ServerSearchHit): SearchHit {
  return {
    kind: hit.kind,
    id: hit.id,
    title: hit.title,
    ...(hit.subtitle ? { subtitle: hit.subtitle } : {}),
    score: hit.score,
  };
}

/**
 * Group client + server hits into stable sections.
 * When `recentIds` is provided and the query is empty, a Recent section is prepended.
 */
export function mergeSearchSections(
  clientHits: SearchHit[],
  serverHits: SearchHit[],
  opts?: { query?: string; recentIds?: string[]; recentHits?: SearchHit[] },
): SearchSection[] {
  const query = opts?.query?.trim() ?? '';
  const combined = [...clientHits, ...serverHits];
  const byKind = new Map<SearchHitKind, SearchHit[]>();
  for (const hit of combined) {
    const list = byKind.get(hit.kind) ?? [];
    list.push(hit);
    byKind.set(hit.kind, list);
  }
  for (const list of byKind.values()) {
    list.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  }

  const sections: SearchSection[] = [];

  if (!query && opts?.recentHits && opts.recentHits.length > 0) {
    sections.push({ id: 'recent', label: 'Recent', hits: opts.recentHits });
  }

  for (const def of SECTION_ORDER) {
    if (def.id === 'recent') continue;
    const hits: SearchHit[] = [];
    for (const kind of def.kinds) {
      hits.push(...(byKind.get(kind) ?? []));
    }
    if (hits.length === 0) continue;
    // When empty query, skip dumping the entire catalog into Problems — only show
    // actions/panels and recent. Callers should pass a filtered client set.
    if (!query && (def.id === 'problems' || def.id === 'categories' || def.id === 'glossary')) {
      continue;
    }
    sections.push({ id: def.id, label: def.label, hits });
  }

  return sections;
}

/** Flat ordered list of hits from sections (for keyboard selection). */
export function flattenSearchSections(sections: SearchSection[]): SearchHit[] {
  return sections.flatMap((s) => s.hits);
}
