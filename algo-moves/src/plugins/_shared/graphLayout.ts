/**
 * Shared node-positioning helpers for graph visualizers and simulators.
 * Sized to GraphBoard's default 352×286 viewport; pass smaller w/h for compact boards.
 */

/** Place n nodes evenly on a circle. */
export function circleLayout(n: number, w = 352, h = 286, pad = 44): [number, number][] {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2 - pad;
  if (n <= 1) return [[cx, cy]];
  return Array.from({ length: n }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [Math.round(cx + r * Math.cos(angle)), Math.round(cy + r * Math.sin(angle))] as [number, number];
  });
}

/** Lay nodes out on a grid of `cols` columns (row-major). Good for layered/DAG shapes. */
export function gridLayout(n: number, cols: number, w = 352, h = 286, pad = 44): [number, number][] {
  const rows = Math.max(1, Math.ceil(n / cols));
  const dx = cols > 1 ? (w - 2 * pad) / (cols - 1) : 0;
  const dy = rows > 1 ? (h - 2 * pad) / (rows - 1) : 0;
  return Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = cols > 1 ? pad + c * dx : w / 2;
    const y = rows > 1 ? pad + r * dy : h / 2;
    return [Math.round(x), Math.round(y)] as [number, number];
  });
}

/** Explicit layered layout: `layers` is an array of node-id arrays, left→right. */
export function layeredLayout(layers: number[][], n: number, w = 352, h = 286, pad = 44): [number, number][] {
  const pos: [number, number][] = Array.from({ length: n }, () => [w / 2, h / 2]);
  const cols = layers.length;
  layers.forEach((layer, ci) => {
    const x = cols > 1 ? Math.round(pad + (ci * (w - 2 * pad)) / (cols - 1)) : Math.round(w / 2);
    layer.forEach((node, ri) => {
      const y = layer.length > 1 ? Math.round(pad + (ri * (h - 2 * pad)) / (layer.length - 1)) : Math.round(h / 2);
      pos[node] = [x, y];
    });
  });
  return pos;
}
