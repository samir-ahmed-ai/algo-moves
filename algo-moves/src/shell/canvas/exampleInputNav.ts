/** Step to the previous/next sample input by delta (-1 | 1). Returns undefined at bounds. */
export function stepExampleInput<T extends { id: string }>(
  inputs: T[],
  inputId: string,
  delta: number,
): T | undefined {
  const i = exampleInputIndex(inputs, inputId);
  return inputs[i + delta];
}

/** Index of the active sample input; falls back to 0 when id is missing. */
export function exampleInputIndex(inputs: { id: string }[], inputId: string): number {
  const i = inputs.findIndex((x) => x.id === inputId);
  return i >= 0 ? i : 0;
}
