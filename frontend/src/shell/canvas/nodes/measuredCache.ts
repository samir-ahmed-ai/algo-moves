/** Last measured panel heights from ResizeObserver — used by align/tidy. */
const heights = new Map<string, number>();

function normalizeId(id: string): string | null {
  const normalized = id.trim();
  return normalized || null;
}

export function setMeasuredHeight(id: string, height: number) {
  const key = normalizeId(id);
  if (!key) return;
  if (!Number.isFinite(height) || height <= 0) {
    heights.delete(key);
    return;
  }
  heights.set(key, Math.round(height));
}

export function getMeasuredHeight(id: string): number | undefined {
  const key = normalizeId(id);
  return key ? heights.get(key) : undefined;
}

export function clearMeasuredHeight(id: string): void {
  const key = normalizeId(id);
  if (key) heights.delete(key);
}
