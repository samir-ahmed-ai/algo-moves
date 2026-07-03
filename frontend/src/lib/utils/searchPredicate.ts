/**
 * Case-insensitive substring search. Returns true when any provided field
 * contains the query. An empty/whitespace query matches everything (the
 * "no filter" case). Used by catalog + sidebar filtering.
 */
export function matchesQuery(query: string, ...fields: (string | undefined)[]): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((f) => f?.toLowerCase().includes(needle));
}
