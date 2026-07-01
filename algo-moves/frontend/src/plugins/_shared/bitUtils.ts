/** MSB-first binary digits as strings (minimal width, or padded to `width`). */
export function toBitStrings(n: number, width?: number): string[] {
  const v = Math.abs(n);
  if (width != null) {
    const out: string[] = [];
    for (let b = width - 1; b >= 0; b--) out.push(((v >> b) & 1).toString());
    return out;
  }
  if (v === 0) return ['0'];
  return v.toString(2).split('');
}

/** MSB-first binary digits as 0/1 numbers, fixed `width` columns. */
export function toBitNumbers(n: number, width: number): number[] {
  const v = Math.abs(n);
  const out: number[] = [];
  for (let b = width - 1; b >= 0; b--) out.push((v >> b) & 1);
  return out;
}

/** Exponent as MSB-first bit string, e.g. 13 → ["1","1","0","1"]. */
export function exponentBitStrings(exp: number): string[] {
  if (exp === 0) return ['0'];
  const out: string[] = [];
  let e = exp;
  while (e > 0) {
    out.push((e & 1).toString());
    e >>= 1;
  }
  return out.reverse();
}
