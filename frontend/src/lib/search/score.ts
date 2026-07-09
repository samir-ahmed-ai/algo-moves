import type { SearchDocument, SearchFacets } from './types';

/** Strip non-alphanumeric chars for punctuation-free matching (two-sum ↔ twosum). */
export function compactSearchText(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

export function parseSearchTerms(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function fieldBlob(doc: SearchDocument): {
  title: string;
  subtitle: string;
  id: string;
  keywords: string;
  text: string;
  compactText: string;
  compactTitle: string;
  compactKeywords: string;
} {
  const title = doc.title.toLowerCase();
  const subtitle = (doc.subtitle ?? '').toLowerCase();
  const id = doc.id.toLowerCase();
  const keywords = (doc.keywords ?? []).join(' ').toLowerCase();
  const text = `${title} ${subtitle} ${id} ${keywords}`;
  return {
    title,
    subtitle,
    id,
    keywords,
    text,
    compactText: compactSearchText(text),
    compactTitle: compactSearchText(title),
    compactKeywords: compactSearchText(keywords),
  };
}

/**
 * Multi-term AND score. Higher is better. Returns 0 when any term fails to match.
 * Weights: title prefix > title contains > compact title > subtitle/keywords/id.
 */
export function scoreDocument(doc: SearchDocument, terms: string[]): number {
  if (terms.length === 0) return 1;
  const fields = fieldBlob(doc);
  let score = 0;

  for (const term of terms) {
    const compactTerm = compactSearchText(term);
    const textMatch = fields.text.includes(term);
    const compactMatch = compactTerm.length > 0 && fields.compactText.includes(compactTerm);
    if (!textMatch && !compactMatch) return 0;

    if (fields.title.startsWith(term)) score += 8;
    else if (fields.title.includes(term)) score += 4;
    else if (compactTerm && fields.compactTitle.startsWith(compactTerm)) score += 6;
    else if (compactTerm && fields.compactTitle.includes(compactTerm)) score += 2;

    if (fields.subtitle === term) score += 3;
    else if (fields.subtitle.includes(term)) score += 1;

    if (
      fields.id.includes(term) ||
      (compactTerm && compactSearchText(fields.id).includes(compactTerm))
    )
      score += 1;

    if (
      fields.keywords.includes(term) ||
      (compactTerm && fields.compactKeywords.includes(compactTerm))
    )
      score += 2;
  }

  return score;
}

export function documentMatchesFacets(doc: SearchDocument, facets?: SearchFacets): boolean {
  if (!facets) return true;
  const f = doc.facets;
  if (facets.difficulty) {
    if (!f?.difficulty || f.difficulty.toLowerCase() !== facets.difficulty.toLowerCase())
      return false;
  }
  if (facets.track) {
    if (!f?.track || f.track.toLowerCase() !== facets.track.toLowerCase()) return false;
  }
  if (facets.tag) {
    const needle = facets.tag.toLowerCase();
    const tags = (doc.keywords ?? []).map((k) => k.toLowerCase());
    if (f?.tag?.toLowerCase() === needle) return true;
    if (!tags.some((t) => t === needle || t.includes(needle))) return false;
  }
  if (facets.categoryId) {
    if (!f?.categoryId || f.categoryId !== facets.categoryId) return false;
  }
  return true;
}

/** Case-insensitive substring match across fields — drop-in for matchesQuery. */
export function matchesSearchFields(query: string, ...fields: (string | undefined)[]): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const terms = parseSearchTerms(needle);
  if (terms.length === 0) return true;
  const blob = fields.map((f) => f?.trim().toLowerCase() ?? '').join(' ');
  const compactBlob = compactSearchText(blob);
  return terms.every((term) => {
    const compactTerm = compactSearchText(term);
    return blob.includes(term) || (compactTerm.length > 0 && compactBlob.includes(compactTerm));
  });
}
