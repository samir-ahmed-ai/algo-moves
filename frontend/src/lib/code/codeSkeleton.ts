/** Keep package/import/header block and replace function bodies with `// …` stubs. */
export function extractSkeleton(ref: string): string {
  const lines = ref.split('\n');
  const out: string[] = [];
  let i = 0;

  // Preserve leading package/import/comment header until first top-level func/type.
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (/^func\s/.test(trimmed) || /^type\s+\w+/.test(trimmed)) break;
    out.push(line);
    i++;
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (/^func\s/.test(trimmed)) {
      const sig = line.replace(/\{\s*$/, '').trimEnd();
      out.push(sig.endsWith('{') ? sig : `${sig} {`);
      out.push('\t// …');
      out.push('}');
      i++;
      // Skip original body until matching closing brace at column 0 or func indent.
      let depth = 1;
      while (i < lines.length && depth > 0) {
        const t = lines[i].trim();
        if (t.includes('{')) depth += t.match(/\{/g)?.length ?? 0;
        if (t.includes('}')) depth -= t.match(/\}/g)?.length ?? 0;
        i++;
      }
      continue;
    }

    if (/^type\s+\w+/.test(trimmed) && trimmed.endsWith('{')) {
      out.push(line);
      i++;
      while (i < lines.length) {
        out.push(lines[i]);
        if (lines[i].trim() === '}') {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    out.push(line);
    i++;
  }

  return out.join('\n').trimEnd() + '\n';
}
