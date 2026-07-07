const INDENT = 2;

function isPrimitiveJson(value: unknown): boolean {
  return value === null || typeof value !== 'object';
}

function stringifyPrimitive(value: unknown): string {
  const serialized = JSON.stringify(value);
  return serialized === undefined ? String(value) : serialized;
}

/** Compact single-line JSON for arrays and inline object values. */
function formatCompact(value: unknown): string {
  if (isPrimitiveJson(value)) return stringifyPrimitive(value);
  if (Array.isArray(value)) {
    return `[${value.map(formatCompact).join(', ')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return '{}';
  return `{${entries.map(([k, v]) => `${stringifyPrimitive(k)}: ${formatCompact(v)}`).join(', ')}}`;
}

function formatObject(obj: Record<string, unknown>, depth: number): string {
  const entries = Object.entries(obj);
  if (entries.length === 0) return '{}';
  const pad = ' '.repeat(depth * INDENT);
  const inner = ' '.repeat((depth + 1) * INDENT);
  const lines = entries.map(
    ([k, v]) => `${inner}${stringifyPrimitive(k)}: ${formatValue(v, depth + 1)}`,
  );
  return `{\n${lines.join(',\n')}\n${pad}}`;
}

function formatValue(value: unknown, depth: number): string {
  if (isPrimitiveJson(value)) return stringifyPrimitive(value);
  if (Array.isArray(value)) {
    if (value.every(isPrimitiveJson)) {
      return `[${value.map((v) => stringifyPrimitive(v)).join(', ')}]`;
    }
    const pad = ' '.repeat(depth * INDENT);
    const inner = ' '.repeat((depth + 1) * INDENT);
    const lines = value.map((v) => `${inner}${formatCompact(v)}`);
    return `[\n${lines.join(',\n')}\n${pad}]`;
  }
  return formatObject(value as Record<string, unknown>, depth);
}

/** Pretty-print a value for read-only UI display. Parses JSON strings when possible. */
export function formatJsonDisplay(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') {
    const t = value.trim();
    if (t.startsWith('{') || t.startsWith('[')) {
      try {
        return formatValue(JSON.parse(t), 0);
      } catch {
        /* fall through */
      }
    }
    return value;
  }
  try {
    return formatValue(value, 0);
  } catch {
    return String(value);
  }
}

/** True when a brief output string looks like JSON rather than plain text. */
export function looksLikeJson(value: string): boolean {
  const t = value.trim();
  return t.startsWith('{') || t.startsWith('[');
}
