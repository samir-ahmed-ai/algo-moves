/** Pretty-print a value for read-only UI display. Parses JSON strings when possible. */
export function formatJsonDisplay(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') {
    const t = value.trim();
    if (t.startsWith('{') || t.startsWith('[')) {
      try {
        return JSON.stringify(JSON.parse(t), null, 2);
      } catch {
        /* fall through */
      }
    }
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/** True when a brief output string looks like JSON rather than plain text. */
export function looksLikeJson(value: string): boolean {
  const t = value.trim();
  return t.startsWith('{') || t.startsWith('[');
}
