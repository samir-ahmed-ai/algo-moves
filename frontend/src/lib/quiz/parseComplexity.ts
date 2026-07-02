export interface ComplexityInfo {
  time?: string;
  space?: string;
}

/** Parse `Time:` / `Space:` from solution header comments (e.g. `// Time: O(V+E) | Space: O(V)`). */
export function parseComplexity(text: string): ComplexityInfo {
  const time = text.match(/Time:\s*(O\([^)]+\)|[^|\n]+)/i)?.[1]?.trim();
  const space = text.match(/Space:\s*(O\([^)]+\)|[^\n]+)/i)?.[1]?.trim();
  return { time, space };
}
