/** Last measured panel heights from ResizeObserver — used by align/tidy. */
const heights = new Map<string, number>();

export function setMeasuredHeight(id: string, height: number) {
  heights.set(id, height);
}

export function getMeasuredHeight(id: string): number | undefined {
  return heights.get(id);
}
