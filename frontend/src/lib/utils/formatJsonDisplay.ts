const INDENT = 2;
const MAX_DEPTH = 6;

function isPrimitiveJson(value: unknown): boolean {
  return value === null || typeof value !== 'object';
}

function stringifyPrimitive(value: unknown): string {
  const serialized = JSON.stringify(value);
  return serialized === undefined ? String(value) : serialized;
}

/** Compact single-line JSON for arrays and inline object values. */
function formatCompact(value: unknown, depth = 0, seen?: WeakSet<object>): string {
  if (isPrimitiveJson(value)) return stringifyPrimitive(value);
  if (typeof value === 'object' && value !== null) {
    if (seen?.has(value)) return '[object Object]';
    seen?.add(value);
  }
  if (depth >= MAX_DEPTH) return Array.isArray(value) ? '[...]' : '{...}';
  if (Array.isArray(value)) {
    return `[${value.map((entry) => formatCompact(entry, depth + 1, seen)).join(', ')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return '{}';
  return `{${entries
    .map(([k, v]) => `${stringifyPrimitive(k)}: ${formatCompact(v, depth + 1, seen)}`)
    .join(', ')}}`;
}

function formatObject(obj: Record<string, unknown>, depth: number, seen: WeakSet<object>): string {
  const entries = Object.entries(obj);
  if (entries.length === 0) return '{}';
  if (depth >= MAX_DEPTH) return '{...}';
  const pad = ' '.repeat(depth * INDENT);
  const inner = ' '.repeat((depth + 1) * INDENT);
  const lines = entries.map(
    ([k, v]) => `${inner}${stringifyPrimitive(k)}: ${formatValue(v, depth + 1, seen)}`,
  );
  return `{\n${lines.join(',\n')}\n${pad}}`;
}

function formatValue(value: unknown, depth: number, seen = new WeakSet<object>()): string {
  if (isPrimitiveJson(value)) return stringifyPrimitive(value);
  if (typeof value === 'object' && value !== null) {
    if (seen.has(value)) return '[object Object]';
    seen.add(value);
  }
  if (depth >= MAX_DEPTH) return Array.isArray(value) ? '[...]' : '{...}';
  if (Array.isArray(value)) {
    if (value.every(isPrimitiveJson)) {
      return `[${value.map((v) => stringifyPrimitive(v)).join(', ')}]`;
    }
    const pad = ' '.repeat(depth * INDENT);
    const inner = ' '.repeat((depth + 1) * INDENT);
    const lines = value.map((v) => `${inner}${formatCompact(v, depth + 1, seen)}`);
    return `[\n${lines.join(',\n')}\n${pad}]`;
  }
  return formatObject(value as Record<string, unknown>, depth, seen);
}

function hasCircular(value: unknown, seen = new WeakSet<object>()): boolean {
  if (value === null || typeof value !== 'object') return false;
  if (seen.has(value)) return true;
  seen.add(value);
  if (Array.isArray(value)) return value.some((entry) => hasCircular(entry, seen));
  return Object.values(value).some((entry) => hasCircular(entry, seen));
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
  if (typeof value === 'object' && hasCircular(value)) {
    return String(value);
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
