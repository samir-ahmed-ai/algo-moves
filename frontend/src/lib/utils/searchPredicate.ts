/**
 * Case-insensitive multi-term search. Returns true when every query term
 * matches somewhere across the provided fields (substring or compact alnum).
 * An empty/whitespace query matches everything (the "no filter" case).
 * Used by catalog + sidebar filtering.
 */
import { matchesSearchFields } from '@/lib/search/score';

export function matchesQuery(query: string, ...fields: (string | undefined)[]): boolean {
  return matchesSearchFields(query, ...fields);
}
