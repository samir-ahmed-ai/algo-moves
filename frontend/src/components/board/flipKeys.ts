/**
 * Stable FLIP identities for board values: same value keeps the same key
 * across frames so FlipFrame can slide it to its new slot. Duplicates are
 * disambiguated by occurrence order — a "swap" of two equal values maps to
 * identity, which reads correctly (nothing appears to move).
 *
 * The key also embeds the value's total count: when a duplicate is added or
 * removed, every sibling of that value changes identity and none of them
 * animate. Occurrence renumbering would otherwise make a survivor inherit an
 * evicted sibling's position and visibly slide the wrong way (e.g. a queue
 * dequeue of [7,2,7] sending the tail 7 backward).
 */
export function flipKeys(values: readonly (string | number)[], prefix = ''): string[] {
  const totals = new Map<string | number, number>();
  for (const v of values) totals.set(v, (totals.get(v) ?? 0) + 1);
  const seen = new Map<string | number, number>();
  return values.map((v) => {
    const n = seen.get(v) ?? 0;
    seen.set(v, n + 1);
    return `${prefix}${v}#${n}/${totals.get(v)}`;
  });
}
